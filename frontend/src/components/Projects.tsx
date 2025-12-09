import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const Projects: React.FC = () => {
  const { projects, tasks, addProject, deleteProject, addTask, completeTask, deleteTask } = useApp();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await addProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowProjectForm(false);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Delete this project? All tasks will be moved to inbox.')) {
      try {
        await deleteProject(id);
        if (selectedProjectId === id) {
          setSelectedProjectId(null);
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !selectedProjectId) return;

    try {
      await addTask(newTaskText.trim(), selectedProjectId);
      setNewTaskText('');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = selectedProjectId
    ? tasks.filter(t => t.projectId === selectedProjectId)
    : [];
  const pendingTasks = projectTasks.filter(t => t.status === 'pending');
  const completedTasks = projectTasks.filter(t => t.status === 'completed');

  return (
    <div className="flex-1 flex">
      {/* Projects Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📁 Projects
            </h2>
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="px-3 py-1 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg
                font-medium transition-colors duration-150"
            >
              {showProjectForm ? '✕' : '+'}
            </button>
          </div>

          {showProjectForm && (
            <form onSubmit={handleAddProject} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                  rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                autoFocus
              />
              <textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description (optional)..."
                className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                  rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                rows={2}
              />
              <button
                type="submit"
                className="mt-2 w-full px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg
                  font-medium transition-colors duration-150 text-sm"
              >
                Create Project
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {projects.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
              No projects yet
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const taskCount = tasks.filter(t => t.projectId === project.id).length;
                const isSelected = selectedProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors group
                      ${isSelected
                        ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500 dark:border-primary-400'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                          />
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {project.name}
                          </h3>
                        </div>
                        {project.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {taskCount} task{taskCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600
                          dark:hover:text-red-400 transition-all text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project Tasks View */}
      <div className="flex-1 flex flex-col">
        {selectedProject ? (
          <>
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedProject.color || '#3b82f6' }}
                />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedProject.name}
                </h2>
              </div>
              {selectedProject.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {selectedProject.description}
                </p>
              )}

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a task to this project..."
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

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {projectTasks.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl">📋</span>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    No tasks in this project yet
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
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
                              onClick={() => completeTask(task.id)}
                              className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600
                                hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                            />
                            <span className="flex-1 text-gray-900 dark:text-white">
                              {task.text}
                            </span>
                            <button
                              onClick={() => handleDeleteProject && deleteTask(task.id)}
                              className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                                transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                              onClick={() => deleteTask(task.id)}
                              className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                                transition-colors"
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-6xl">📁</span>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                Select a project to view its tasks
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
