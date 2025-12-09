export interface Idea {
  id: string;
  text: string;
  description?: string;
  createdAt: string;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  archived: boolean;
}

export interface Task {
  id: string;
  text: string;
  status: 'pending' | 'completed';
  projectId?: string | null;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

export interface Suggestion {
  taskId: string;
  suggestedProjectId: string | null;
  confidence: number;
  reasoning: string;
}

export interface AppData {
  ideas: Idea[];
  projects: Project[];
  tasks: Task[];
}

export type Section = 'ideas' | 'inbox' | 'projects';
