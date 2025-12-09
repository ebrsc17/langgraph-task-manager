# Phase 3 Enhanced Architecture

## Overview
Expanding the simple task manager into a full-featured productivity system with Ideas, Inbox, and Projects organization, powered by AI suggestions.

## Data Models

### Idea
```typescript
interface Idea {
  id: string;
  text: string;
  description?: string;
  createdAt: string;
  tags?: string[];
}
```

### Task
```typescript
interface Task {
  id: string;
  text: string;
  status: 'pending' | 'completed';
  projectId?: string; // null/undefined = inbox task
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  archived?: boolean;
}
```

### Application State
```typescript
interface AppState {
  ideas: Idea[];
  inbox: Task[]; // Tasks without projectId
  projects: Project[];
  allTasks: Task[]; // All tasks including project tasks
}
```

## Backend Changes

### Updated Data Structure
```json
{
  "ideas": [
    {
      "id": "idea-1",
      "text": "Build mobile app",
      "description": "Could expand the task manager to mobile",
      "createdAt": "2024-01-15T10:30:00Z",
      "tags": ["feature", "mobile"]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "Work",
      "description": "Work-related tasks",
      "color": "#3b82f6",
      "createdAt": "2024-01-10T09:00:00Z"
    }
  ],
  "tasks": [
    {
      "id": "task-1",
      "text": "Buy milk",
      "status": "pending",
      "projectId": null, // Inbox task
      "createdAt": "2024-01-15T14:00:00Z"
    },
    {
      "id": "task-2",
      "text": "Finish quarterly report",
      "status": "pending",
      "projectId": "proj-1", // Project task
      "priority": "high",
      "dueDate": "2024-01-20T17:00:00Z",
      "createdAt": "2024-01-15T09:15:00Z"
    }
  ]
}
```

### New API Endpoints

#### Ideas Management
- `POST /ideas` - Add new idea
- `GET /ideas` - List all ideas
- `PUT /ideas/{id}` - Update idea
- `DELETE /ideas/{id}` - Delete idea
- `POST /ideas/{id}/to-task` - Convert idea to task

#### Projects Management
- `POST /projects` - Create new project
- `GET /projects` - List all projects
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Archive/delete project
- `GET /projects/{id}/tasks` - Get tasks for project

#### Enhanced Tasks
- `POST /tasks` - Add task (with optional projectId)
- `GET /tasks` - List all tasks
- `GET /tasks/inbox` - Get inbox tasks only
- `PUT /tasks/{id}` - Update task
- `PUT /tasks/{id}/move` - Move task to project
- `DELETE /tasks/{id}` - Delete task

#### AI Features
- `POST /ai/suggest-project` - Suggest which project a task should belong to
  ```json
  {
    "taskText": "Schedule team meeting",
    "projects": [...existing projects...]
  }
  // Returns: { "suggestedProjectId": "proj-1", "confidence": 0.85, "reasoning": "..." }
  ```

- `POST /ai/categorize-inbox` - Analyze all inbox tasks and suggest categorization
  ```json
  {
    "inboxTasks": [...],
    "projects": [...]
  }
  // Returns: [{ "taskId": "...", "suggestedProjectId": "...", "reasoning": "..." }]
  ```

### Enhanced LangGraph Flow

```
┌─────────────────┐
│  Parse Intent   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Router  │
    └────┬────┘
         │
    ┌────┴─────────────────────────────────────────────┐
    │                                                   │
┌───▼─────┐  ┌──────────┐  ┌──────────┐  ┌────────────▼───┐
│Add Idea │  │Add Task  │  │Add Project│  │Suggest Project │
└─────────┘  └──────────┘  └──────────┘  └────────────────┘
    │            │              │               │
    └────────────┴──────────────┴───────────────┘
                 │
            ┌────▼────┐
            │Response │
            └─────────┘
```

## Frontend Architecture

### Component Structure
```
src/
├── App.tsx
├── components/
│   ├── Layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ThemeToggle.tsx
│   ├── Ideas/
│   │   ├── IdeasList.tsx
│   │   ├── IdeaCard.tsx
│   │   ├── AddIdeaForm.tsx
│   │   └── IdeaToTaskConverter.tsx
│   ├── Inbox/
│   │   ├── InboxList.tsx
│   │   ├── QuickAddTask.tsx
│   │   ├── TaskCard.tsx
│   │   └── SuggestionsPanel.tsx
│   ├── Projects/
│   │   ├── ProjectsList.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectView.tsx
│   │   ├── AddProjectForm.tsx
│   │   └── TaskList.tsx
│   ├── Shared/
│   │   ├── NaturalLanguageInput.tsx
│   │   ├── IntentDisplay.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FilterControls.tsx
│   │   └── LoadingSpinner.tsx
│   └── AI/
│       ├── SuggestionCard.tsx
│       └── AutoCategorize.tsx
├── hooks/
│   ├── useIdeas.ts
│   ├── useTasks.ts
│   ├── useProjects.ts
│   ├── useAISuggestions.ts
│   └── useTheme.ts
├── services/
│   ├── api.ts
│   └── aiService.ts
├── types/
│   └── index.ts
├── utils/
│   ├── dateHelpers.ts
│   └── taskHelpers.ts
└── styles/
    └── globals.css
```

### Key Features Implementation

#### 1. Sidebar Navigation
- Three main sections: Ideas, Inbox, Projects
- Active section highlighting
- Project list with color indicators
- Collapsible on mobile

#### 2. Natural Language Input
- Global input bar at top
- Shows parsed intent classification
- Supports commands like:
  - "add idea: mobile app for task manager"
  - "add to inbox: buy milk"
  - "add to Work: finish report"
  - "create project: Personal"
  - "suggest projects for inbox"

#### 3. AI Auto-Suggestions
- Analyze inbox tasks in background
- Show suggestion badges on inbox tasks
- One-click to accept suggestion
- Batch categorize all inbox items

#### 4. Dark Mode
- System preference detection
- Manual toggle
- Persistent in localStorage
- Smooth transitions

#### 5. Advanced UX
- Drag-and-drop tasks between inbox and projects
- Keyboard shortcuts (n: new task, p: new project, /: search)
- Smooth animations for transitions
- Optimistic updates
- Toast notifications

## State Management

### Using React Context + Hooks
```typescript
// contexts/AppContext.tsx
interface AppContextType {
  ideas: Idea[];
  projects: Project[];
  inbox: Task[];
  allTasks: Task[];

  // Actions
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt'>) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  moveTaskToProject: (taskId: string, projectId: string) => Promise<void>;
  getSuggestions: (taskId: string) => Promise<Suggestion>;

  // UI State
  darkMode: boolean;
  toggleDarkMode: () => void;
  activeSection: 'ideas' | 'inbox' | 'projects';
  setActiveSection: (section: string) => void;
}
```

## API Integration Strategy

### 1. Initial Load
```typescript
// Fetch all data on app load
const loadData = async () => {
  const [ideas, projects, tasks] = await Promise.all([
    api.getIdeas(),
    api.getProjects(),
    api.getTasks()
  ]);

  const inbox = tasks.filter(t => !t.projectId);
  return { ideas, projects, tasks, inbox };
};
```

### 2. Optimistic Updates
```typescript
// Update UI immediately, rollback on error
const addTask = async (taskData) => {
  const optimisticTask = { id: tempId(), ...taskData };
  setTasks(prev => [...prev, optimisticTask]);

  try {
    const savedTask = await api.addTask(taskData);
    setTasks(prev => prev.map(t => t.id === optimisticTask.id ? savedTask : t));
  } catch (error) {
    setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
    showError('Failed to add task');
  }
};
```

### 3. AI Suggestions (Debounced)
```typescript
// Fetch suggestions when inbox changes (debounced)
useEffect(() => {
  const timer = setTimeout(() => {
    if (inbox.length > 0) {
      fetchSuggestions(inbox);
    }
  }, 2000);

  return () => clearTimeout(timer);
}, [inbox]);
```

## Styling Approach

### Tailwind Configuration
- Custom color palette for projects
- Dark mode variants
- Custom animations
- Typography scale

### Design System
- Consistent spacing (4px grid)
- Color scheme:
  - Primary: Blue (#3b82f6)
  - Success: Green (#10b981)
  - Warning: Yellow (#f59e0b)
  - Danger: Red (#ef4444)
- Rounded corners (8px standard)
- Shadows for depth

## Testing Strategy

### Unit Tests
- Component rendering
- Hook logic
- Utility functions

### Integration Tests
- API communication
- State management
- User flows

### E2E Tests
- Critical user journeys
- AI suggestion flow
- Drag and drop

## Performance Considerations

1. **Code Splitting**
   - Lazy load project views
   - Split AI suggestion code

2. **Memoization**
   - Memo expensive computations
   - UseMemo for filtered lists

3. **Virtualization**
   - Virtual scrolling for large task lists

4. **Debouncing**
   - Search input
   - AI suggestion requests

## Deployment

### Development
- Vite dev server: `npm run dev`
- Backend: `uvicorn server:app --reload`

### Production
- Build: `npm run build`
- Serve frontend static files via backend
- Single deployment artifact

## Migration Path

1. **Phase 3.1**: Setup + Basic UI (Ideas, Inbox, Projects structure)
2. **Phase 3.2**: Backend updates (new data models, endpoints)
3. **Phase 3.3**: Core features (add/edit/delete across sections)
4. **Phase 3.4**: Natural language + Intent display
5. **Phase 3.5**: AI suggestions feature
6. **Phase 3.6**: Polish (dark mode, animations, keyboard shortcuts)
7. **Phase 3.7**: Testing + bug fixes

## Success Criteria

- [ ] User can add ideas and convert them to tasks
- [ ] User can quickly add tasks to inbox
- [ ] User can create projects and organize tasks
- [ ] AI suggests relevant projects for inbox tasks
- [ ] Natural language input works for all actions
- [ ] Dark mode works seamlessly
- [ ] Filtering and search work correctly
- [ ] Drag-and-drop works between sections
- [ ] Keyboard shortcuts improve productivity
- [ ] Mobile responsive design
- [ ] Error states handled gracefully
- [ ] Loading states shown appropriately
