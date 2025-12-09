import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const Inbox: React.FC = () => {
  const { inboxTasks, addTask, completeTask, deleteTask } = useApp();
  const [newTaskText, setNewTaskText] = useState('');

  const pendingTasks = inboxTasks.filter(t => t.status === 'pending');
  const completedTasks = inboxTasks.filter(t => t.status === 'completed');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    try {
      await addTask(newTaskText.trim());
      setNewTaskText('');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeTask(id);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this task?')) {
      try {
        await deleteTask(id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
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
        <form onSubmit={handleSubmit} className="mt-4">
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

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {inboxTasks.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl">📥</span>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Inbox is empty. Add a task to get started!
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
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700 rounded-lg
                        hover:shadow-md transition-shadow duration-150"
                    >
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600
                          hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                        title="Mark as complete"
                      />
                      <span className="flex-1 text-gray-900 dark:text-white">
                        {task.text}
                      </span>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                          transition-colors"
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
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
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50
                        border border-gray-200 dark:border-gray-700 rounded-lg opacity-75"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-primary-500 dark:border-primary-400
                        bg-primary-500 dark:bg-primary-400 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="flex-1 text-gray-600 dark:text-gray-400 line-through">
                        {task.text}
                      </span>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                          transition-colors"
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
