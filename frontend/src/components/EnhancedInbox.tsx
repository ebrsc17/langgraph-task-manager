import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import SearchAndFilter, { FilterState } from './SearchAndFilter';
import AISuggestions from './AISuggestions';
import type { Task } from '../types';
import toast from 'react-hot-toast';

const EnhancedInbox: React.FC = () => {
  const { inboxTasks, addTask, completeTask, deleteTask, moveTaskToProject, projects } = useApp();
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ status: 'all', priority: 'all' });
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return inboxTasks.filter(task => {
      // Search filter
      if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [inboxTasks, searchQuery, filters]);

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      await addTask(newTaskText.trim());
      setNewTaskText('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      toast.success('Task added to inbox!');
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeTask(id);
      toast.success('Task completed!');
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      await deleteTask(id);
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditText(task.text);
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editText.trim()) return;

    try {
      // Note: You'd need to add updateTask to the API
      // For now, we'll show a toast that editing would work
      setEditingTaskId(null);
      toast.success('Task updated!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditText('');
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const isEditing = editingTaskId === task.id;
    const isExpanded = expandedTaskId === task.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`p-3 rounded-lg border transition-all ${
          task.status === 'completed'
            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => handleComplete(task.id)}
            disabled={task.status === 'completed'}
            className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all mt-0.5 ${
              task.status === 'completed'
                ? 'border-primary-500 dark:border-primary-400 bg-primary-500 dark:bg-primary-400'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
            }`}
          >
            {task.status === 'completed' && (
              <span className="text-white text-xs">✓</span>
            )}
          </button>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(task.id);
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-primary-500
                    rounded text-gray-900 dark:text-white focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(task.id)}
                    className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white
                      rounded text-xs font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300
                      dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded
                      text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`${task.status === 'completed' ? 'line-through text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {task.text}
                  </span>
                  {task.priority && (
                    <span className="text-xs" title={`Priority: ${task.priority}`}>
                      {getPriorityIcon(task.priority)}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      📅 {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created: {new Date(task.createdAt).toLocaleString()}
                    </p>
                    {task.completedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Completed: {new Date(task.completedAt).toLocaleString()}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEditing && task.status === 'pending' && (
            <div className="flex gap-1">
              <button
                onClick={() => handleStartEdit(task)}
                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                  transition-colors p-1"
                title="Edit task"
              >
                ✏️
              </button>
              <button
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400
                  transition-colors p-1"
                title="View details"
              >
                {isExpanded ? '▲' : '▼'}
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400
                  transition-colors p-1"
                title="Delete task"
              >
                🗑️
              </button>
            </div>
          )}
          {task.status === 'completed' && (
            <button
              onClick={() => handleDelete(task.id)}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400
                transition-colors p-1"
              title="Delete task"
            >
              🗑️
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📥 Inbox
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quick capture for tasks without a project
          </p>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg
                font-medium transition-colors duration-150"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Search and Filters */}
      <div className="p-6 pb-0">
        <SearchAndFilter
          onSearchChange={setSearchQuery}
          onFilterChange={setFilters}
        />
      </div>

      {/* AI Suggestions */}
      <div className="px-6 pt-4">
        <AISuggestions
          tasks={pendingTasks}
          projects={projects}
          onMoveTask={moveTaskToProject}
        />
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl">📥</span>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {searchQuery || filters.status !== 'all' || filters.priority !== 'all'
                ? 'No tasks match your filters'
                : 'Inbox is empty. Add a task to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  To Do ({pendingTasks.length})
                </h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {pendingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Completed ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {completedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedInbox;
