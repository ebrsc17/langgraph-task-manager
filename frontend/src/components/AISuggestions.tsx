import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { Task, Project, Suggestion } from '../types';
import * as api from '../services/api';

interface Props {
  tasks: Task[];
  projects: Project[];
  onMoveTask: (taskId: string, projectId: string) => Promise<void>;
}

const AISuggestions: React.FC<Props> = ({ tasks, projects, onMoveTask }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchSuggestions = async () => {
    if (tasks.length === 0 || projects.length === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const result = await api.categorizeInbox();
      setSuggestions(result.suggestions.filter(s => s.suggestedProjectId && s.confidence > 0.5));
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 2000);

    return () => clearTimeout(timer);
  }, [tasks, projects]);

  const handleApplySuggestion = async (suggestion: Suggestion) => {
    if (!suggestion.suggestedProjectId) return;

    try {
      await onMoveTask(suggestion.taskId, suggestion.suggestedProjectId);
      setSuggestions(prev => prev.filter(s => s.taskId !== suggestion.taskId));
      toast.success('Task moved to project!');
    } catch (error) {
      toast.error('Failed to move task');
    }
  };

  const handleDismiss = (taskId: string) => {
    setSuggestions(prev => prev.filter(s => s.taskId !== taskId));
  };

  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20
        border border-purple-200 dark:border-purple-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                AI Suggestions
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {loading ? 'Analyzing...' : `${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''} for your inbox tasks`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400
              hover:bg-purple-100 dark:hover:bg-purple-900 rounded-lg transition-colors"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {suggestions.map((suggestion) => {
                const task = tasks.find(t => t.id === suggestion.taskId);
                const project = projects.find(p => p.id === suggestion.suggestedProjectId);

                if (!task || !project) return null;

                return (
                  <motion.div
                    key={suggestion.taskId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {task.text}
                          </span>
                          <span className="text-xs text-gray-500">→</span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                              {project.name}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {suggestion.reasoning}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${suggestion.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white
                            rounded-lg text-xs font-medium transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleDismiss(suggestion.taskId)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                            text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AISuggestions;
