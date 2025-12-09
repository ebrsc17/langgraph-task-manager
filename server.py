from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langserve import add_routes
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from typing import TypedDict, Literal, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from datetime import datetime
import json
import os
import uuid

load_dotenv()

# --- File Storage Configuration ---
IDEAS_FILE = "ideas.json"
PROJECTS_FILE = "projects.json"
TASKS_FILE = "tasks.json"

# --- Pydantic Models ---
class Idea(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    description: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    tags: Optional[list[str]] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    archived: bool = False

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    status: Literal["pending", "completed"] = "pending"
    projectId: Optional[str] = None  # None = inbox task
    dueDate: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    completedAt: Optional[str] = None

class Suggestion(BaseModel):
    taskId: str
    suggestedProjectId: Optional[str] = None
    confidence: float
    reasoning: str

# --- File Storage Functions ---
def load_json_file(filepath: str, default=None):
    """Generic JSON file loader."""
    if default is None:
        default = []

    if not os.path.exists(filepath):
        return default

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            return data if data else default
    except (json.JSONDecodeError, IOError):
        return default

def save_json_file(filepath: str, data) -> None:
    """Generic JSON file saver."""
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    except IOError as e:
        print(f"[ERROR] Failed to save {filepath}: {e}")

def load_ideas() -> list[dict]:
    """Load ideas from JSON file."""
    return load_json_file(IDEAS_FILE, [])

def save_ideas(ideas: list[dict]) -> None:
    """Save ideas to JSON file."""
    save_json_file(IDEAS_FILE, ideas)

def load_projects() -> list[dict]:
    """Load projects from JSON file."""
    return load_json_file(PROJECTS_FILE, [])

def save_projects(projects: list[dict]) -> None:
    """Save projects to JSON file."""
    save_json_file(PROJECTS_FILE, projects)

def load_tasks() -> list[dict]:
    """Load tasks from JSON file."""
    return load_json_file(TASKS_FILE, [])

def save_tasks(tasks: list[dict]) -> None:
    """Save tasks to JSON file."""
    save_json_file(TASKS_FILE, tasks)

# --- State Definition ---
class AppState(TypedDict):
    user_input: str
    intent: str
    tasks: list[dict]
    ideas: list[dict]
    projects: list[dict]
    response: str

# --- LLM Setup ---
def build_llm() -> ChatOpenAI:
    """Configure OpenRouter-backed model from environment variables."""
    base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    api_key = os.environ.get("OPENROUTER_API_KEY")
    model = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet-20241022")

    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Add it to your environment or .env.local."
        )

    headers = {}
    referer = os.environ.get("OPENROUTER_REFERRER")
    if referer:
        headers["HTTP-Referer"] = referer
    app_id = os.environ.get("OPENROUTER_APP_ID")
    if app_id:
        headers["X-Title"] = app_id

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=0,
        default_headers=headers or None,
    )


llm = build_llm()

# --- Node Functions ---
def parse_intent(state: AppState) -> dict:
    """Use lightweight keyword guardrails first, then LLM as fallback."""
    # Load all data from files at the start of each request
    tasks = load_tasks()
    ideas = load_ideas()
    projects = load_projects()

    print(f"[DEBUG] Loaded {len(tasks)} tasks, {len(ideas)} ideas, {len(projects)} projects")

    user_text = state["user_input"].strip().lower()
    print(f"[DEBUG] Raw input: {repr(state['user_input'])}")
    print(f"[DEBUG] Processed input: {repr(user_text)}")

    # Fast heuristics for common patterns
    if not user_text:
        print("[DEBUG] Empty input → help")
        return {"intent": "help", "tasks": tasks, "ideas": ideas, "projects": projects}

    if "help" in user_text:
        print("[DEBUG] Keyword 'help' found → help")
        return {"intent": "help", "tasks": tasks, "ideas": ideas, "projects": projects}

    # Ideas
    if "idea" in user_text and any(kw in user_text for kw in ["add", "create", "new"]):
        print("[DEBUG] Add idea keyword found → add_idea")
        return {"intent": "add_idea", "tasks": tasks, "ideas": ideas, "projects": projects}

    # Projects
    if "project" in user_text and any(kw in user_text for kw in ["add", "create", "new"]):
        print("[DEBUG] Add project keyword found → add_project")
        return {"intent": "add_project", "tasks": tasks, "ideas": ideas, "projects": projects}

    # Tasks
    if any(kw in user_text for kw in ["list", "show"]):
        print("[DEBUG] List keyword found → list_all")
        return {"intent": "list_all", "tasks": tasks, "ideas": ideas, "projects": projects}

    if any(kw in user_text for kw in ["complete", "done", "finish", "check off"]):
        print("[DEBUG] Complete keyword found → complete_task")
        return {"intent": "complete_task", "tasks": tasks, "ideas": ideas, "projects": projects}

    if any(kw in user_text for kw in ["delete", "remove", "rm", "trash"]):
        print("[DEBUG] Delete keyword found → delete_task")
        return {"intent": "delete_task", "tasks": tasks, "ideas": ideas, "projects": projects}

    if any(kw in user_text for kw in ["add", "create", "new task", "todo"]):
        print("[DEBUG] Add keyword found → add_task")
        return {"intent": "add_task", "tasks": tasks, "ideas": ideas, "projects": projects}

    # Fallback to LLM classification for ambiguous phrasing
    print("[DEBUG] No keywords matched, using LLM fallback")
    messages = [
        SystemMessage(content="""You are an intent classifier for a productivity app with Ideas, Inbox, and Projects.
Classify the user's intent into exactly one of these categories:
- add_idea: User wants to add/create a new idea
- add_project: User wants to create a new project
- add_task: User wants to add/create a new task
- list_all: User wants to see their items (tasks, ideas, or projects)
- complete_task: User wants to mark a task as done
- delete_task: User wants to remove a task
- help: User needs help or is confused

Respond with ONLY the category name, nothing else."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    intent = result.content.strip().lower()

    valid_intents = ["add_idea", "add_project", "add_task", "list_all", "complete_task", "delete_task", "help"]
    if intent not in valid_intents:
        intent = "help"

    print(f"[DEBUG] Determined intent: {intent}")
    return {"intent": intent, "tasks": tasks, "ideas": ideas, "projects": projects}

def add_idea(state: AppState) -> dict:
    """Extract idea from input and add it"""
    messages = [
        SystemMessage(content="""Extract the idea description from the user's message.
Return ONLY the idea text, nothing else. Keep it concise."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    idea_text = result.content.strip()

    ideas = state.get("ideas", [])
    new_idea = Idea(text=idea_text).model_dump()
    ideas.append(new_idea)

    save_ideas(ideas)
    print(f"[DEBUG] Saved {len(ideas)} ideas to file")

    return {
        "ideas": ideas,
        "tasks": state.get("tasks", []),
        "projects": state.get("projects", []),
        "response": f"💡 Added idea: {idea_text}"
    }

def add_project(state: AppState) -> dict:
    """Extract project name from input and create it"""
    messages = [
        SystemMessage(content="""Extract the project name from the user's message.
Return ONLY the project name, nothing else. Keep it concise."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    project_name = result.content.strip()

    projects = state.get("projects", [])
    new_project = Project(name=project_name).model_dump()
    projects.append(new_project)

    save_projects(projects)
    print(f"[DEBUG] Saved {len(projects)} projects to file")

    return {
        "projects": projects,
        "tasks": state.get("tasks", []),
        "ideas": state.get("ideas", []),
        "response": f"📁 Created project: {project_name}"
    }

def add_task(state: AppState) -> dict:
    """Extract task from input and add it to inbox"""
    messages = [
        SystemMessage(content="""Extract the task description from the user's message.
Return ONLY the task text, nothing else. Keep it concise."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    task_text = result.content.strip()

    tasks = state.get("tasks", [])
    new_task = Task(text=task_text).model_dump()
    tasks.append(new_task)

    save_tasks(tasks)
    print(f"[DEBUG] Saved {len(tasks)} tasks to file")

    return {
        "tasks": tasks,
        "ideas": state.get("ideas", []),
        "projects": state.get("projects", []),
        "response": f"✅ Added task to inbox: {task_text}"
    }

def list_all(state: AppState) -> dict:
    """List all ideas, inbox tasks, and projects"""
    ideas = state.get("ideas", [])
    tasks = state.get("tasks", [])
    projects = state.get("projects", [])

    lines = []

    # Ideas
    if ideas:
        lines.append("💡 Ideas:")
        for idea in ideas[:5]:  # Show first 5
            lines.append(f"  • {idea['text']}")
        if len(ideas) > 5:
            lines.append(f"  ... and {len(ideas) - 5} more")
    else:
        lines.append("💡 No ideas yet")

    lines.append("")

    # Inbox tasks
    inbox_tasks = [t for t in tasks if not t.get("projectId")]
    if inbox_tasks:
        lines.append("📥 Inbox:")
        for task in inbox_tasks[:5]:
            status = "✓" if task["status"] == "completed" else "○"
            lines.append(f"  {status} {task['text']}")
        if len(inbox_tasks) > 5:
            lines.append(f"  ... and {len(inbox_tasks) - 5} more")
    else:
        lines.append("📥 Inbox is empty")

    lines.append("")

    # Projects
    if projects:
        lines.append("📁 Projects:")
        for project in projects[:5]:
            project_tasks = [t for t in tasks if t.get("projectId") == project["id"]]
            lines.append(f"  • {project['name']} ({len(project_tasks)} tasks)")
        if len(projects) > 5:
            lines.append(f"  ... and {len(projects) - 5} more")
    else:
        lines.append("📁 No projects yet")

    return {
        "response": "\n".join(lines),
        "tasks": tasks,
        "ideas": ideas,
        "projects": projects
    }

def complete_task(state: AppState) -> dict:
    """Mark a task as complete by ID"""
    messages = [
        SystemMessage(content="""Extract the task ID (UUID format) from the user's message.
Return ONLY the ID, nothing else. If you see a number instead of UUID, return that number."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    task_id = result.content.strip()

    tasks = state.get("tasks", [])

    for task in tasks:
        if task["id"] == task_id or str(task.get("id")) == task_id:
            task["status"] = "completed"
            task["completedAt"] = datetime.utcnow().isoformat() + "Z"

            save_tasks(tasks)
            print(f"[DEBUG] Saved {len(tasks)} tasks to file")

            return {
                "tasks": tasks,
                "ideas": state.get("ideas", []),
                "projects": state.get("projects", []),
                "response": f"✅ Completed task: {task['text']}"
            }

    return {
        "response": f"❌ Task not found",
        "tasks": tasks,
        "ideas": state.get("ideas", []),
        "projects": state.get("projects", [])
    }

def delete_task(state: AppState) -> dict:
    """Delete a task by ID"""
    messages = [
        SystemMessage(content="""Extract the task ID from the user's message.
Return ONLY the ID, nothing else."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    task_id = result.content.strip()

    tasks = state.get("tasks", [])
    original_len = len(tasks)
    tasks = [t for t in tasks if t["id"] != task_id and str(t.get("id")) != task_id]

    if len(tasks) < original_len:
        save_tasks(tasks)
        print(f"[DEBUG] Saved {len(tasks)} tasks to file")

        return {
            "tasks": tasks,
            "ideas": state.get("ideas", []),
            "projects": state.get("projects", []),
            "response": f"🗑️ Deleted task"
        }

    return {
        "response": f"❌ Task not found",
        "tasks": tasks,
        "ideas": state.get("ideas", []),
        "projects": state.get("projects", [])
    }

def show_help(state: AppState) -> dict:
    """Show help message"""
    return {
        "response": """🤖 Productivity Manager Help:

Ideas:
  • "add idea [text]" - Brainstorm a new idea

Inbox (Quick Tasks):
  • "add [task]" - Add task to inbox
  • "complete [id]" - Mark task as done
  • "delete [id]" - Remove task

Projects:
  • "create project [name]" - Create a new project
  • "add to [project] [task]" - Add task to project (via web UI)

General:
  • "list" or "show" - See all items
  • "help" - Show this message

Examples:
  • "add idea mobile app for tasks"
  • "create project Work"
  • "add buy groceries"
  • "list"
""",
        "tasks": state.get("tasks", []),
        "ideas": state.get("ideas", []),
        "projects": state.get("projects", [])
    }

# --- Router ---
def route_intent(state: AppState) -> Literal["add_idea", "add_project", "add_task", "list_all", "complete_task", "delete_task", "help"]:
    """Route to the appropriate node based on intent"""
    return state["intent"]

# --- Build the Graph ---
graph = StateGraph(AppState)

# Add nodes
graph.add_node("parse_intent", parse_intent)
graph.add_node("add_idea", add_idea)
graph.add_node("add_project", add_project)
graph.add_node("add_task", add_task)
graph.add_node("list_all", list_all)
graph.add_node("complete_task", complete_task)
graph.add_node("delete_task", delete_task)
graph.add_node("help", show_help)

# Set entry point
graph.set_entry_point("parse_intent")

# Add conditional routing
graph.add_conditional_edges(
    "parse_intent",
    route_intent,
    {
        "add_idea": "add_idea",
        "add_project": "add_project",
        "add_task": "add_task",
        "list_all": "list_all",
        "complete_task": "complete_task",
        "delete_task": "delete_task",
        "help": "help"
    }
)

# All action nodes go to END
graph.add_edge("add_idea", END)
graph.add_edge("add_project", END)
graph.add_edge("add_task", END)
graph.add_edge("list_all", END)
graph.add_edge("complete_task", END)
graph.add_edge("delete_task", END)
graph.add_edge("help", END)

# Compile
app_graph = graph.compile()

# --- Input/Output schemas for LangServe ---
class NLInput(BaseModel):
    user_input: str

class NLOutput(BaseModel):
    response: str
    tasks: list[dict]
    ideas: list[dict]
    projects: list[dict]
    intent: str

# --- FastAPI App ---
app = FastAPI(
    title="Productivity Manager API",
    description="A comprehensive productivity manager with Ideas, Inbox, and Projects powered by LangGraph and AI",
    version="2.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the LangGraph app as a route for natural language processing
add_routes(
    app,
    app_graph,
    path="/nl",
    input_type=NLInput,
    output_type=NLOutput,
)

# --- REST API Endpoints ---

# Health check
@app.get("/")
def root():
    return {
        "status": "running",
        "version": "2.0",
        "endpoints": {
            "nl_playground": "http://localhost:8000/nl/playground",
            "api_docs": "http://localhost:8000/docs",
            "ideas": "http://localhost:8000/ideas",
            "projects": "http://localhost:8000/projects",
            "tasks": "http://localhost:8000/tasks"
        }
    }

# Get all data
@app.get("/data")
def get_all_data():
    """Get all ideas, projects, and tasks"""
    return {
        "ideas": load_ideas(),
        "projects": load_projects(),
        "tasks": load_tasks()
    }

# --- Ideas Endpoints ---
@app.get("/ideas")
def get_ideas():
    """Get all ideas"""
    return load_ideas()

@app.post("/ideas")
def create_idea(idea: Idea):
    """Create a new idea"""
    ideas = load_ideas()
    idea_dict = idea.model_dump()
    ideas.append(idea_dict)
    save_ideas(ideas)
    return idea_dict

@app.put("/ideas/{idea_id}")
def update_idea(idea_id: str, updated_idea: Idea):
    """Update an existing idea"""
    ideas = load_ideas()
    for i, idea in enumerate(ideas):
        if idea["id"] == idea_id:
            updated_dict = updated_idea.model_dump()
            updated_dict["id"] = idea_id  # Preserve original ID
            ideas[i] = updated_dict
            save_ideas(ideas)
            return updated_dict
    raise HTTPException(status_code=404, detail="Idea not found")

@app.delete("/ideas/{idea_id}")
def delete_idea(idea_id: str):
    """Delete an idea"""
    ideas = load_ideas()
    original_len = len(ideas)
    ideas = [i for i in ideas if i["id"] != idea_id]
    if len(ideas) < original_len:
        save_ideas(ideas)
        return {"message": "Idea deleted"}
    raise HTTPException(status_code=404, detail="Idea not found")

@app.post("/ideas/{idea_id}/to-task")
def convert_idea_to_task(idea_id: str):
    """Convert an idea to a task"""
    ideas = load_ideas()
    tasks = load_tasks()

    idea = next((i for i in ideas if i["id"] == idea_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    new_task = Task(text=idea["text"]).model_dump()
    tasks.append(new_task)
    save_tasks(tasks)

    # Optionally remove the idea
    ideas = [i for i in ideas if i["id"] != idea_id]
    save_ideas(ideas)

    return new_task

# --- Projects Endpoints ---
@app.get("/projects")
def get_projects():
    """Get all projects"""
    return load_projects()

@app.post("/projects")
def create_project(project: Project):
    """Create a new project"""
    projects = load_projects()
    project_dict = project.model_dump()
    projects.append(project_dict)
    save_projects(projects)
    return project_dict

@app.put("/projects/{project_id}")
def update_project(project_id: str, updated_project: Project):
    """Update an existing project"""
    projects = load_projects()
    for i, project in enumerate(projects):
        if project["id"] == project_id:
            updated_dict = updated_project.model_dump()
            updated_dict["id"] = project_id  # Preserve original ID
            projects[i] = updated_dict
            save_projects(projects)
            return updated_dict
    raise HTTPException(status_code=404, detail="Project not found")

@app.delete("/projects/{project_id}")
def delete_project(project_id: str):
    """Delete/archive a project"""
    projects = load_projects()
    tasks = load_tasks()

    # Check if project exists
    project = next((p for p in projects if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Remove projectId from all tasks in this project (move to inbox)
    for task in tasks:
        if task.get("projectId") == project_id:
            task["projectId"] = None
    save_tasks(tasks)

    # Remove project
    projects = [p for p in projects if p["id"] != project_id]
    save_projects(projects)

    return {"message": "Project deleted, tasks moved to inbox"}

@app.get("/projects/{project_id}/tasks")
def get_project_tasks(project_id: str):
    """Get all tasks for a specific project"""
    tasks = load_tasks()
    project_tasks = [t for t in tasks if t.get("projectId") == project_id]
    return project_tasks

# --- Tasks Endpoints ---
@app.get("/tasks")
def get_tasks():
    """Get all tasks"""
    return load_tasks()

@app.get("/tasks/inbox")
def get_inbox_tasks():
    """Get inbox tasks (tasks without projectId)"""
    tasks = load_tasks()
    inbox = [t for t in tasks if not t.get("projectId")]
    return inbox

@app.post("/tasks")
def create_task(task: Task):
    """Create a new task"""
    tasks = load_tasks()
    task_dict = task.model_dump()
    tasks.append(task_dict)
    save_tasks(tasks)
    return task_dict

@app.put("/tasks/{task_id}")
def update_task(task_id: str, updated_task: Task):
    """Update an existing task"""
    tasks = load_tasks()
    for i, task in enumerate(tasks):
        if task["id"] == task_id:
            updated_dict = updated_task.model_dump()
            updated_dict["id"] = task_id  # Preserve original ID
            tasks[i] = updated_dict
            save_tasks(tasks)
            return updated_dict
    raise HTTPException(status_code=404, detail="Task not found")

@app.put("/tasks/{task_id}/move")
def move_task_to_project(task_id: str, project_id: Optional[str] = None):
    """Move a task to a project (or back to inbox if project_id is None)"""
    tasks = load_tasks()
    for task in tasks:
        if task["id"] == task_id:
            task["projectId"] = project_id
            save_tasks(tasks)
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@app.put("/tasks/{task_id}/complete")
def mark_task_complete(task_id: str):
    """Mark a task as complete"""
    tasks = load_tasks()
    for task in tasks:
        if task["id"] == task_id:
            task["status"] = "completed"
            task["completedAt"] = datetime.utcnow().isoformat() + "Z"
            save_tasks(tasks)
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@app.delete("/tasks/{task_id}")
def delete_task_endpoint(task_id: str):
    """Delete a task"""
    tasks = load_tasks()
    original_len = len(tasks)
    tasks = [t for t in tasks if t["id"] != task_id]
    if len(tasks) < original_len:
        save_tasks(tasks)
        return {"message": "Task deleted"}
    raise HTTPException(status_code=404, detail="Task not found")

# --- AI Suggestion Endpoints ---
class SuggestProjectRequest(BaseModel):
    taskText: str
    taskId: Optional[str] = None

@app.post("/ai/suggest-project", response_model=Suggestion)
def suggest_project(request: SuggestProjectRequest):
    """Use AI to suggest which project a task should belong to"""
    projects = load_projects()

    if not projects:
        return Suggestion(
            taskId=request.taskId or "unknown",
            suggestedProjectId=None,
            confidence=0.0,
            reasoning="No projects available. Task will stay in inbox."
        )

    projects_info = "\n".join([f"- {p['name']}: {p.get('description', 'No description')}" for p in projects])

    messages = [
        SystemMessage(content=f"""You are helping categorize a task into one of the user's projects.

Available projects:
{projects_info}

Analyze the task and suggest which project it belongs to. Consider the task description and project names/descriptions.

Respond with ONLY a JSON object in this exact format:
{{
  "projectId": "the-project-id-or-null",
  "projectName": "the project name",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this project fits"
}}

If no project is a good match, set projectId to null and confidence to 0."""),
        HumanMessage(content=f"Task: {request.taskText}")
    ]

    result = llm.invoke(messages)
    try:
        response_data = json.loads(result.content.strip())
        project_id = response_data.get("projectId")

        if project_id and project_id != "null":
            # Verify project exists
            if not any(p["id"] == project_id or p["name"] == response_data.get("projectName") for p in projects):
                # Find by name
                matching_project = next((p for p in projects if p["name"] == response_data.get("projectName")), None)
                if matching_project:
                    project_id = matching_project["id"]
                else:
                    project_id = None

        return Suggestion(
            taskId=request.taskId or "unknown",
            suggestedProjectId=project_id,
            confidence=float(response_data.get("confidence", 0.5)),
            reasoning=response_data.get("reasoning", "AI suggestion")
        )
    except (json.JSONDecodeError, KeyError) as e:
        print(f"[ERROR] Failed to parse AI response: {e}")
        return Suggestion(
            taskId=request.taskId or "unknown",
            suggestedProjectId=None,
            confidence=0.0,
            reasoning="Failed to analyze task"
        )

@app.post("/ai/categorize-inbox")
def categorize_inbox():
    """Analyze all inbox tasks and suggest project categorization"""
    tasks = load_tasks()
    projects = load_projects()
    inbox_tasks = [t for t in tasks if not t.get("projectId")]

    if not inbox_tasks:
        return {"message": "Inbox is empty", "suggestions": []}

    if not projects:
        return {"message": "No projects available. Create projects first.", "suggestions": []}

    suggestions = []
    for task in inbox_tasks:
        suggestion = suggest_project(SuggestProjectRequest(taskText=task["text"], taskId=task["id"]))
        suggestions.append(suggestion.model_dump())

    return {"suggestions": suggestions}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
