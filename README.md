# Quack

Quack is a text-based debugging coach for students. Instead of giving you a fix, it asks questions that help you work out what is wrong with your code. The project was built for IceHacks 2026.

## Why we built it

AI can make it easy to get working code without understanding why the original code failed. We wanted to make debugging practice more useful for students, so Quack guides them through the problem rather than solving it for them.

## What it does

- You can describe a bug in chat or choose one of the included examples.
- Quack asks one question at a time, using the code, error output, and conversation as context.
- It can point to relevant lines in the Monaco editor and offer more specific hints when you get stuck.
- The example programs are available in Python, JavaScript, TypeScript, Java, C++, C, C#, Go, Rust, HTML, and plain text. Changing the language keeps the selected example and loads its corresponding code.
- When you finish, Quack gives you a short debrief with the concept, what you did well, takeaways, and a question to consider next time.

## How it works

The browser sends the student's message, code, error output, and hint level to a small Python API. Gemini generates a response in a structured format. A code-level guardrail checks the response for code or direct instructions before it is shown. If a response fails the check, Quack asks Gemini to try again and uses a safe fallback if needed.

The guardrail is implemented in `duck_brain.py` in `check_reply`. It permits references to code the student already wrote while rejecting newly suggested code and direct fixes. The tests are in `test_duck_brain.py`.

## Run it locally

Quack uses Python 3.10 or later and has no third-party Python dependencies.

```bash
cp .env.example .env
# Add your Gemini API key to .env
python server.py
```

Open `http://localhost:8000`. Without a Gemini API key, Quack runs in demo mode with scripted replies. To run the guardrail tests, use `python -m unittest -v`.

You can create a Gemini API key at <https://aistudio.google.com/apikey>. Keep it in `.env` locally or in your hosting provider's environment settings; do not commit it.

## Deployment

The project can run on Render using the included `render.yaml`. On Vercel, the Python WSGI entrypoint serves `/api/health`, `/api/duck`, and `/api/debrief`, while the files in `public/` serve the frontend. Set `GEMINI_API_KEY` as a server-side environment variable to enable live Gemini responses. Without it, the app remains usable in demo mode.

## Built with

Python, vanilla JavaScript, HTML, CSS, Monaco Editor, and the Google Gemini API.

## AI use

Gemini generates Quack's questions and debriefs at runtime. AI coding assistants, including Codex and Claude, also helped with implementation and debugging. The team reviewed the project and its guardrails.

## Challenges and next steps

The main challenge was getting an AI to guide students without giving them the answer. Prompting helped, but it was not reliable enough on its own, so we added a response guardrail and retries.

Next, we would like to bring Quack into coding editors, add more examples, and explore classroom tools that help teachers see which concepts students find difficult.
