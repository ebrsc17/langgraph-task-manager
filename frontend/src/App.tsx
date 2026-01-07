import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './contexts/AppContext';
import { useKeyboardShortcuts, APP_SHORTCUTS } from './hooks/useKeyboardShortcuts';
import Sidebar from './components/Sidebar';
import Ideas from './components/Ideas';
import EnhancedInbox from './components/EnhancedInbox';
import Projects from './components/Projects';
import NaturalLanguageInput from './components/NaturalLanguageInput';
import { motion, AnimatePresence } from 'framer-motion';

const KeyboardShortcutsHelp: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: '1', description: 'Go to Ideas' },
    { keys: '2', description: 'Go to Inbox' },
    { keys: '3', description: 'Go to Projects' },
    { keys: 'n', description: 'New task (when in Inbox)' },
    { keys: 'p', description: 'New project' },
    { keys: 'i', description: 'New idea' },
    { keys: '/', description: 'Focus search' },
    { keys: 'Ctrl/Cmd + D', description: 'Toggle dark mode' },
    { keys: '?', description: 'Show this help' },
    { keys: 'Esc', description: 'Close dialogs' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              ⌨️ Keyboard Shortcuts
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  rounded text-sm font-mono border border-gray-300 dark:border-gray-600">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const AppContent: React.FC = () => {
  const { activeSection, setActiveSection, loading, error, refreshData, toggleDarkMode } = useApp();
  const [showHelp, setShowHelp] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '1',
      handler: () => setActiveSection('ideas'),
      description: 'Go to Ideas',
    },
    {
      key: '2',
      handler: () => setActiveSection('inbox'),
      description: 'Go to Inbox',
    },
    {
      key: '3',
      handler: () => setActiveSection('projects'),
      description: 'Go to Projects',
    },
    {
      key: 'd',
      ctrl: true,
      handler: toggleDarkMode,
      description: 'Toggle dark mode',
    },
    {
      key: '?',
      shift: true,
      handler: () => setShowHelp(true),
      description: 'Show keyboard shortcuts help',
    },
    {
      key: 'Escape',
      handler: () => setShowHelp(false),
      description: 'Close help',
    },
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4"
            >
              <p className="text-red-700 dark:text-red-200">{error}</p>
            </motion.div>
          )}

          {/* Natural Language Input Bar */}
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <NaturalLanguageInput onSuccess={refreshData} />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {activeSection === 'ideas' && <Ideas />}
                {activeSection === 'inbox' && <EnhancedInbox />}
                {activeSection === 'projects' && <Projects />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="fixed bottom-6 right-6 w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white
              rounded-full shadow-lg flex items-center justify-center text-xl transition-all
              hover:scale-110"
            title="Keyboard shortcuts (press ?)"
          >
            ⌨️
          </button>
        </main>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
