"""Claude (Anthropic API): writes what the AI voice says on the call.

Purpose:  turns the user's task ("Essay outline, due Friday") into a short,
          friendly call script. Does NOT place the call.
Called by: service.py
Why separate: the call provider (Dial/ElevenLabs) is one choice, the language
          model is another. Keeping them apart lets us change either.
"""


async def write_call_script(task_title: str | None) -> str:
    # TODO: call the Anthropic API with settings.anthropic_api_key.
    # Prompt must say: identify as Concentr8, say it is an AI voice, keep it
    # under one minute, ask what the first small step is, offer to stop.
    # Until then, a fixed text keeps the rest of the pipeline testable.
    task = task_title or "your study session"
    return (
        "Hi, this is Concentr8, an AI voice assistant. "
        f"You asked me to call you to start {task}. "
        "What is the first small step you can take right now?"
    )
