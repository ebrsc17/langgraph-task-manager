import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface NLResponse {
  response: string;
  tasks: any[];
  ideas: any[];
  projects: any[];
  intent: string;
}

interface Props {
  onSuccess?: () => void;
}

const NaturalLanguageInput: React.FC<Props> = ({ onSuccess }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);

  const intentColors: Record<string, string> = {
    add_idea: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
    add_project: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    add_task: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    list_all: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    complete_task: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    delete_task: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    help: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  };

  const intentLabels: Record<string, string> = {
    add_idea: '💡 Add Idea',
    add_project: '📁 Create Project',
    add_task: '✅ Add Task',
    list_all: '📋 List Items',
    complete_task: '✓ Complete Task',
    delete_task: '🗑️ Delete Task',
    help: '❓ Help',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setLastIntent(null);

    try {
      const response = await fetch('http://localhost:8000/nl/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { user_input: input } }),
      });

      if (!response.ok) throw new Error('Failed to process command');

      const data: { output: NLResponse } = await response.json();
      const result = data.output;

      setLastIntent(result.intent);
      toast.success(result.response, { duration: 3000 });
      setInput('');

      // Refresh data after successful command
      if (onSuccess) {
        setTimeout(onSuccess, 500);
      }
    } catch (error) {
      console.error('NL Input error:', error);
      toast.error('Failed to process command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try: "add idea mobile app", "create project Work", "add buy milk"...'
            disabled={loading}
            className="w-full px-4 py-3 pr-24 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700
              rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
            )}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700
                text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        <AnimatePresence>
          {lastIntent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 top-full mt-2 z-10"
            >
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${intentColors[lastIntent] || 'bg-gray-100 dark:bg-gray-800'}`}>
                {intentLabels[lastIntent] || lastIntent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium">💡 Tips:</span> Use natural language like "add task buy groceries" or "create project Work"
      </div>
    </div>
  );
};

export default NaturalLanguageInput;
