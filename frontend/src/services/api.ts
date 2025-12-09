import type { Idea, Project, Task, AppData, Suggestion } from '../types';

const API_BASE_URL = 'http://localhost:8000';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Get all data
export const getAllData = (): Promise<AppData> => {
  return fetchAPI<AppData>('/data');
};

// Ideas API
export const getIdeas = (): Promise<Idea[]> => {
  return fetchAPI<Idea[]>('/ideas');
};

export const createIdea = (idea: Partial<Idea>): Promise<Idea> => {
  return fetchAPI<Idea>('/ideas', {
    method: 'POST',
    body: JSON.stringify(idea),
  });
};

export const updateIdea = (id: string, idea: Partial<Idea>): Promise<Idea> => {
  return fetchAPI<Idea>(`/ideas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(idea),
  });
};

export const deleteIdea = (id: string): Promise<{ message: string }> => {
  return fetchAPI<{ message: string }>(`/ideas/${id}`, {
    method: 'DELETE',
  });
};

export const convertIdeaToTask = (id: string): Promise<Task> => {
  return fetchAPI<Task>(`/ideas/${id}/to-task`, {
    method: 'POST',
  });
};

// Projects API
export const getProjects = (): Promise<Project[]> => {
  return fetchAPI<Project[]>('/projects');
};

export const createProject = (project: Partial<Project>): Promise<Project> => {
  return fetchAPI<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  });
};

export const updateProject = (id: string, project: Partial<Project>): Promise<Project> => {
  return fetchAPI<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(project),
  });
};

export const deleteProject = (id: string): Promise<{ message: string }> => {
  return fetchAPI<{ message: string }>(`/projects/${id}`, {
    method: 'DELETE',
  });
};

export const getProjectTasks = (id: string): Promise<Task[]> => {
  return fetchAPI<Task[]>(`/projects/${id}/tasks`);
};

// Tasks API
export const getTasks = (): Promise<Task[]> => {
  return fetchAPI<Task[]>('/tasks');
};

export const getInboxTasks = (): Promise<Task[]> => {
  return fetchAPI<Task[]>('/tasks/inbox');
};

export const createTask = (task: Partial<Task>): Promise<Task> => {
  return fetchAPI<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
};

export const updateTask = (id: string, task: Partial<Task>): Promise<Task> => {
  return fetchAPI<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });
};

export const moveTaskToProject = (taskId: string, projectId: string | null): Promise<Task> => {
  return fetchAPI<Task>(`/tasks/${taskId}/move?project_id=${projectId || ''}`, {
    method: 'PUT',
  });
};

export const completeTask = (id: string): Promise<Task> => {
  return fetchAPI<Task>(`/tasks/${id}/complete`, {
    method: 'PUT',
  });
};

export const deleteTask = (id: string): Promise<{ message: string }> => {
  return fetchAPI<{ message: string }>(`/tasks/${id}`, {
    method: 'DELETE',
  });
};

// AI Suggestions API
export const suggestProject = (taskText: string, taskId?: string): Promise<Suggestion> => {
  return fetchAPI<Suggestion>('/ai/suggest-project', {
    method: 'POST',
    body: JSON.stringify({ taskText, taskId }),
  });
};

export const categorizeInbox = (): Promise<{ suggestions: Suggestion[] }> => {
  return fetchAPI<{ suggestions: Suggestion[] }>('/ai/categorize-inbox', {
    method: 'POST',
  });
};
