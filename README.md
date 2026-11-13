# 🦆 Quack: the rubber duck that talks back

> Explain your bug in chat. Quack asks questions until **you** find the bug.
> It never writes code and never gives you the fix.

Built for **IceHacks 2026**.

## The problem
Students learning to code now have AI that writes the fix instantly. Pasting the bug into a chatbot gets the code running, but the student often doesn't learn why it broke, and the same bug comes back next week.

Programmers have long debugged by **explaining their code to a rubber duck**. Walking through the details makes you notice what you skipped. A normal duck can't ask follow-up questions, though.

## What it does
- 💬 **Chat through the bug.** Describe the issue in text and Quack replies with a focused question.
- ❓ **Socratic questions only.** Quack asks one question at a time: expected vs. actual output, then predicting values, then tracing lines.
- 👀 **Points at your code.** The lines Quack is asking about are highlighted in the editor with a 🦆 in the margin.
- 🧭 **Hint ladder.** Click "I'm stuck" to get more specific questions (3 levels). Even level 3 is still a question.
- 🛡️ **Guardrail.** Every AI reply is checked by code before it appears. Replies containing code blocks, new code, or instructions like "change X to Y" or "the bug is…" are rejected and regenerated. The UI shows how many answers the duck held back.
- 🧠 **Insight trail.** Your realizations are collected as you make them.
- 🎉 **Debrief.** When you fix it, you get the concept name, what you did well, 3 takeaways, and a question to ask yourself next time. The stats always show **0 lines of code written by AI**.

## How it works
```mermaid
flowchart LR
    A["Student's text"] --> B["Browser app (Monaco editor)"]
    B -->|"code + message + hint level"| C["Python server /api/duck"]
    C --> D["Gemini (Socratic system prompt, JSON output)"]
    D --> E{"Guardrail check"}
    E -->|"leaks code or the fix"| D
    E -->|"safe question"| B
```

**Guardrail details** ([duck_brain.py](duck_brain.py) `check_reply`): rejects code fences, multi-line code, backtick snippets or `a = b` expressions **that don't already exist in the student's code** (so the duck can still say "what is `i` on line 3?"), phrases that instruct a fix, and replies that don't ask a question. A rejected reply is sent back to the model with the reason (up to 2 retries). If it still fails, Quack falls back to a safe, generic tracing question. Covered by unit tests in [test_duck_brain.py](test_duck_brain.py).

## Run it locally
Needs only **Python 3.10+**. No packages to install.

```bash
cp .env.example .env        # then paste your Gemini API key into .env
python server.py            # open http://localhost:8000 in Chrome or Edge
python -m unittest -v       # run guardrail tests
```
With no API key, the app runs in **demo mode** with scripted questions, so you can try the UI.
Get a free key at https://aistudio.google.com/apikey.

## Deploy (free, Render)
1. Push this folder to a public GitHub repo.
2. On https://render.com → **New → Blueprint** → select the repo (it reads `render.yaml`).
3. Set `GEMINI_API_KEY` when prompted. Done. Render gives you a public `https://….onrender.com` link.

## Deploy to Vercel
The app exposes `/api/health`, `/api/duck`, and `/api/debrief` through a lightweight Python WSGI entrypoint. Frontend assets in `public/` are served by Vercel's CDN and the local Python server. Without `GEMINI_API_KEY`, the public app runs in demo mode, so judges can try the full UI without consuming API quota. To enable live Gemini responses, set `GEMINI_API_KEY` as an encrypted server-side environment variable in the Vercel project and redeploy; never commit `.env`.

## Built with
Python (standard library `http.server`), vanilla JavaScript, HTML/CSS, Monaco Editor, Google Gemini API.

## AI tools used (disclosure)
- **Runtime:** Google Gemini generates Quack's questions and debriefs.
- **Development:** AI coding assistants, including OpenAI Codex and Claude, helped with implementation and debugging. The team directed the work and checked the app and its guardrails.

## Challenges
- Getting an LLM to *not* help too much. Prompting alone wasn't reliable, so we added a code-level guardrail with retries.
- Allowing the duck to mention the student's existing code while still blocking new code (compare against the student's source).
- Keeping the conversation focused: asking one useful debugging question at a time.

## What's next
- VS Code extension, so the duck lives in your editor.
- Run the code in the browser so the duck can say "run it with this input".
- Teacher dashboard: see which concepts a class struggles with (without the AI ever doing the homework).
- More coding examples and classroom-ready learning tools.
