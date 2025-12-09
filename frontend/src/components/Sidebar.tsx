import React from 'react';
import { useApp } from '../contexts/AppContext';
import type { Section } from '../types';

const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, ideas, inboxTasks, projects, darkMode, toggleDarkMode } = useApp();

  const sections: { id: Section; icon: string; label: string; count: number }[] = [
    { id: 'ideas', icon: '💡', label: 'Ideas', count: ideas.length },
    { id: 'inbox', icon: '📥', label: 'Inbox', count: inboxTasks.filter(t => t.status === 'pending').length },
    { id: 'projects', icon: '📁', label: 'Projects', count: projects.length },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Task Manager
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Powered by AI
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg
              transition-colors duration-150
              ${
                activeSection === section.id
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{section.icon}</span>
              <span className="font-medium">{section.label}</span>
            </div>
            {section.count > 0 && (
              <span
                className={`
                  text-xs font-semibold px-2 py-0.5 rounded-full
                  ${
                    activeSection === section.id
                      ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {section.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors duration-150"
        >
          <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
          <span className="font-medium">{darkMode ? 'Light' : 'Dark'} Mode</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
