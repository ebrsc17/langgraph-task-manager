import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Idea, Project, Task, Section } from '../types';
import * as api from '../services/api';

interface AppContextType {
  // Data
  ideas: Idea[];
  projects: Project[];
  tasks: Task[];
  inboxTasks: Task[];

  // UI State
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  loading: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;

  // Ideas
  addIdea: (text: string, description?: string) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  convertIdeaToTask: (id: string) => Promise<void>;

  // Projects
  addProject: (name: string, description?: string, color?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Tasks
  addTask: (text: string, projectId?: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTaskToProject: (taskId: string, projectId: string | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeSection, setActiveSection] = useState<Section>('inbox');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAllData();
      setIdeas(data.ideas);
      setProjects(data.projects);
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Ideas actions
  const addIdea = async (text: string, description?: string) => {
    try {
      const newIdea = await api.createIdea({ text, description });
      setIdeas([...ideas, newIdea]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add idea');
      throw err;
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      await api.deleteIdea(id);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete idea');
      throw err;
    }
  };

  const convertIdeaToTask = async (id: string) => {
    try {
      const newTask = await api.convertIdeaToTask(id);
      setTasks([...tasks, newTask]);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert idea');
      throw err;
    }
  };

  // Projects actions
  const addProject = async (name: string, description?: string, color?: string) => {
    try {
      const newProject = await api.createProject({ name, description, color });
      setProjects([...projects, newProject]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project');
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      // Refresh tasks since they may have been moved to inbox
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      throw err;
    }
  };

  // Tasks actions
  const addTask = async (text: string, projectId?: string) => {
    try {
      const newTask = await api.createTask({ text, projectId: projectId || null });
      setTasks([...tasks, newTask]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
      throw err;
    }
  };

  const completeTask = async (id: string) => {
    try {
      const updatedTask = await api.completeTask(id);
      setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  };

  const moveTaskToProject = async (taskId: string, projectId: string | null) => {
    try {
      const updatedTask = await api.moveTaskToProject(taskId, projectId);
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
      throw err;
    }
  };

  const inboxTasks = tasks.filter(t => !t.projectId);

  const value: AppContextType = {
    ideas,
    projects,
    tasks,
    inboxTasks,
    activeSection,
    setActiveSection,
    darkMode,
    toggleDarkMode,
    loading,
    error,
    refreshData,
    addIdea,
    deleteIdea,
    convertIdeaToTask,
    addProject,
    deleteProject,
    addTask,
    completeTask,
    deleteTask,
    moveTaskToProject,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
