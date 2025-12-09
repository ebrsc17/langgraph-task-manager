# langgraph-task-manager
LangGraph + LangServe demo that turns natural language into a tiny stateful task manager. Ask it to add, list, complete, or delete tasks; it routes intents through a LangGraph state machine and exposes everything via LangServe (playground at /tasks/playground, swagger at /docs, REST streaming endpoints). Uses OpenRouter for LLM calls.
