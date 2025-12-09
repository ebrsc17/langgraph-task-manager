from fastapi import FastAPI
from langserve import add_routes
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from typing import TypedDict, Literal
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import os

load_dotenv()

# --- File Storage Configuration ---
TASKS_FILE = "tasks.json"

def load_tasks() -> list[dict]:
    """Load tasks from JSON file."""
    if not os.path.exists(TASKS_FILE):
        return []

    try:
        with open(TASKS_FILE, 'r') as f:
            tasks = json.load(f)
            return tasks if isinstance(tasks, list) else []
    except (json.JSONDecodeError, IOError):
        return []

def save_tasks(tasks: list[dict]) -> None:
    """Save tasks to JSON file."""
    try:
        with open(TASKS_FILE, 'w') as f:
            json.dump(tasks, f, indent=2)
    except IOError as e:
        print(f"[ERROR] Failed to save tasks: {e}")

# --- State Definition ---
class TaskState(TypedDict):
    user_input: str
    intent: str
    tasks: list[dict]
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
def parse_intent(state: TaskState) -> dict:
    """Use lightweight keyword guardrails first, then LLM as fallback."""
    # Load tasks from file at the start of each request
    tasks = load_tasks()
    print(f"[DEBUG] Loaded {len(tasks)} tasks from file")

    user_text = state["user_input"].strip().lower()
    print(f"[DEBUG] Raw input: {repr(state['user_input'])}")
    print(f"[DEBUG] Processed input: {repr(user_text)}")

    # Fast heuristics for common single-word inputs (e.g., "tasks")
    if not user_text:
        print("[DEBUG] Empty input → help")
        return {"intent": "help", "tasks": tasks}
    if "help" in user_text:
        print("[DEBUG] Keyword 'help' found → help")
        return {"intent": "help", "tasks": tasks}
    if any(kw in user_text for kw in ["list", "show", "tasks"]):
        print("[DEBUG] List keyword found → list_tasks")
        return {"intent": "list_tasks", "tasks": tasks}
    if any(kw in user_text for kw in ["complete", "done", "finish", "check off"]):
        print("[DEBUG] Complete keyword found → complete_task")
        return {"intent": "complete_task", "tasks": tasks}
    if any(kw in user_text for kw in ["delete", "remove", "rm", "trash"]):
        print("[DEBUG] Delete keyword found → delete_task")
        return {"intent": "delete_task", "tasks": tasks}
    if any(kw in user_text for kw in ["add", "create", "new task", "todo"]):
        print("[DEBUG] Add keyword found → add_task")
        return {"intent": "add_task", "tasks": tasks}

    # Fallback to LLM classification for ambiguous phrasing
    print("[DEBUG] No keywords matched, using LLM fallback")
    messages = [
        SystemMessage(content="""You are a task intent classifier.
Classify the user's intent into exactly one of these categories:
- add_task: User wants to add/create a new task
- list_tasks: User wants to see their tasks
- complete_task: User wants to mark a task as done
- delete_task: User wants to remove a task
- help: User needs help or is confused

Respond with ONLY the category name, nothing else."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    intent = result.content.strip().lower()

    valid_intents = ["add_task", "list_tasks", "complete_task", "delete_task", "help"]
    if intent not in valid_intents:
        intent = "help"

    print(f"[DEBUG] Determined intent: {intent}")
    return {"intent": intent, "tasks": tasks}

def add_task(state: TaskState) -> dict:
    """Extract task from input and add it"""
    messages = [
        SystemMessage(content="""Extract the task description from the user's message.
Return ONLY the task text, nothing else. Keep it concise."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    task_text = result.content.strip()

    tasks = state.get("tasks", [])
    new_task = {
        "id": len(tasks) + 1,
        "text": task_text,
        "status": "pending"
    }
    tasks.append(new_task)

    # Save tasks to file
    save_tasks(tasks)
    print(f"[DEBUG] Saved {len(tasks)} tasks to file")

    return {
        "tasks": tasks,
        "response": f"✅ Added task #{new_task['id']}: {task_text}"
    }

def list_tasks(state: TaskState) -> dict:
    """List all tasks"""
    tasks = state.get("tasks", [])

    if not tasks:
        return {
            "response": "📋 No tasks yet. Add one with 'add [task]'",
            "tasks": tasks
        }

    lines = ["📋 Your tasks:"]
    for task in tasks:
        status = "✓" if task["status"] == "done" else "○"
        lines.append(f"  {status} #{task['id']}: {task['text']}")

    return {
        "response": "\n".join(lines),
        "tasks": tasks
    }

def complete_task(state: TaskState) -> dict:
    """Mark a task as complete"""
    messages = [
        SystemMessage(content="""Extract the task number from the user's message.
Return ONLY the number, nothing else. If unclear, return 0."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    try:
        task_id = int(result.content.strip())
    except:
        task_id = 0

    tasks = state.get("tasks", [])

    for task in tasks:
        if task["id"] == task_id:
            task["status"] = "done"

            # Save tasks to file
            save_tasks(tasks)
            print(f"[DEBUG] Saved {len(tasks)} tasks to file")

            return {
                "tasks": tasks,
                "response": f"✅ Completed task #{task_id}: {task['text']}"
            }

    return {
        "response": f"❌ Task #{task_id} not found",
        "tasks": tasks
    }

def delete_task(state: TaskState) -> dict:
    """Delete a task"""
    messages = [
        SystemMessage(content="""Extract the task number from the user's message.
Return ONLY the number, nothing else. If unclear, return 0."""),
        HumanMessage(content=state["user_input"])
    ]

    result = llm.invoke(messages)
    try:
        task_id = int(result.content.strip())
    except:
        task_id = 0

    tasks = state.get("tasks", [])
    original_len = len(tasks)
    tasks = [t for t in tasks if t["id"] != task_id]

    if len(tasks) < original_len:
        # Save tasks to file
        save_tasks(tasks)
        print(f"[DEBUG] Saved {len(tasks)} tasks to file")

        return {
            "tasks": tasks,
            "response": f"🗑️ Deleted task #{task_id}"
        }

    return {
        "response": f"❌ Task #{task_id} not found",
        "tasks": tasks
    }

def show_help(state: TaskState) -> dict:
    """Show help message"""
    tasks = state.get("tasks", [])
    return {
        "response": """🤖 Task Manager Help:

Commands:
  • "add [task]" - Add a new task
  • "list" or "show tasks" - See all tasks
  • "complete [number]" or "done [number]" - Mark task as done
  • "delete [number]" - Remove a task

Examples:
  • "add buy groceries"
  • "complete 1"
  • "show my tasks"
""",
        "tasks": tasks
    }

# --- Router ---
def route_intent(state: TaskState) -> Literal["add_task", "list_tasks", "complete_task", "delete_task", "help"]:
    """Route to the appropriate node based on intent"""
    return state["intent"]

# --- Build the Graph ---
graph = StateGraph(TaskState)

# Add nodes
graph.add_node("parse_intent", parse_intent)
graph.add_node("add_task", add_task)
graph.add_node("list_tasks", list_tasks)
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
        "add_task": "add_task",
        "list_tasks": "list_tasks",
        "complete_task": "complete_task",
        "delete_task": "delete_task",
        "help": "help"
    }
)

# All action nodes go to END
graph.add_edge("add_task", END)
graph.add_edge("list_tasks", END)
graph.add_edge("complete_task", END)
graph.add_edge("delete_task", END)
graph.add_edge("help", END)

# Compile
app_graph = graph.compile()

# --- Input/Output schemas for LangServe ---
class TaskInput(BaseModel):
    user_input: str

class TaskOutput(BaseModel):
    response: str
    tasks: list[dict]
    intent: str

# --- FastAPI + LangServe ---
app = FastAPI(
    title="Task Manager API",
    description="A simple task manager powered by LangGraph",
    version="1.0"
)

# Add the LangGraph app as a route
add_routes(
    app,
    app_graph,
    path="/tasks",
    input_type=TaskInput,
    output_type=TaskOutput,
)

# Health check
@app.get("/")
def root():
    return {"status": "running", "playground": "http://localhost:8000/tasks/playground"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
