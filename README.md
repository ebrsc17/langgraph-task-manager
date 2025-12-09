# LanGraph Task Manager
LangGraph + LangServe demo that turns natural language into a tiny stateful task manager. Ask it to add, list, complete, or delete tasks; it routes intents through a LangGraph state machine and exposes everything via LangServe (playground at /tasks/playground, swagger at /docs, REST streaming endpoints). Uses OpenRouter for LLM calls.



## Architecture

```
User Input → parse_intent (LLM classifies intent)
                    ↓
         ┌─────────┼─────────┐
         ↓         ↓         ↓
     add_task  list_tasks  complete_task  ...
         ↓         ↓         ↓
         └─────────┼─────────┘
                   ↓
              Response
```

The LangGraph state machine handles routing based on user intent, and each node can use the LLM as needed.
