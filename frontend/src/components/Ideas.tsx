import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const Ideas: React.FC = () => {
  const { ideas, addIdea, deleteIdea, convertIdeaToTask } = useApp();
  const [newIdeaText, setNewIdeaText] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;

    try {
      await addIdea(newIdeaText.trim(), newIdeaDesc.trim() || undefined);
      setNewIdeaText('');
      setNewIdeaDesc('');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add idea:', error);
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await convertIdeaToTask(id);
    } catch (error) {
      console.error('Failed to convert idea:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this idea?')) {
      try {
        await deleteIdea(id);
      } catch (error) {
        console.error('Failed to delete idea:', error);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              💡 Ideas
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Capture your thoughts and brainstorm
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg
              font-medium transition-colors duration-150"
          >
            {showForm ? 'Cancel' : '+ New Idea'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="text"
              value={newIdeaText}
              onChange={(e) => setNewIdeaText(e.target.value)}
              placeholder="Idea title..."
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
            <textarea
              value={newIdeaDesc}
              onChange={(e) => setNewIdeaDesc(e.target.value)}
              placeholder="Description (optional)..."
              className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
            />
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg
                font-medium transition-colors duration-150"
            >
              Add Idea
            </button>
          </form>
        )}
      </div>

      {/* Ideas List */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {ideas.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl">💡</span>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              No ideas yet. Start brainstorming!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                  rounded-lg hover:shadow-md transition-shadow duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {idea.text}
                    </h3>
                    {idea.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {idea.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(idea.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConvert(idea.id)}
                      className="px-3 py-1 text-xs font-medium text-primary-600 dark:text-primary-400
                        hover:bg-primary-50 dark:hover:bg-primary-900 rounded transition-colors"
                      title="Convert to task"
                    >
                      → Task
                    </button>
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400
                        hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ideas;
