import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import Ideas from './components/Ideas';
import Inbox from './components/Inbox';
import Projects from './components/Projects';

const AppContent: React.FC = () => {
  const { activeSection, loading, error } = useApp();

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4">
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
        {activeSection === 'ideas' && <Ideas />}
        {activeSection === 'inbox' && <Inbox />}
        {activeSection === 'projects' && <Projects />}
      </main>
    </div>
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
