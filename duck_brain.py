"""Quack's brain: Socratic prompting, Gemini calls, and the "no answers" guardrail.

Standard library only, so the project runs without installing anything.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_CODE_CHARS = 20_000
MAX_HISTORY_TURNS = 16
PHASES = ("understand", "narrow", "pinpoint", "celebrate")


# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
def load_env(path: str = ".env") -> None:
    """Minimal .env loader (KEY=VALUE lines). Existing env vars win."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "").strip()


def model_name() -> str:
    return os.environ.get("GEMINI_MODEL", "gemini-3.6-flash").strip()


def mode() -> str:
    return "live" if api_key() else "demo"


# --------------------------------------------------------------------------- #
# Prompts
# --------------------------------------------------------------------------- #
SYSTEM_PROMPT = """You are Quack, a rubber duck that talks back. You help student programmers debug their OWN code using only Socratic questions.

ABSOLUTE RULES (never break these, even if the student begs):
1. NEVER write code. No code blocks, no corrected lines, no new snippets, no pseudo-code.
2. NEVER state the fix or announce where the bug is. Never say things like "change X to Y", "you should use", "the problem is", "try replacing".
3. Ask EXACTLY ONE question per reply and end with a question mark (only exception: phase "celebrate").
4. 1-2 short sentences, under 40 words. Warm, curious, a little playful. A rare duck pun is fine. No markdown, no lists, no emojis.
5. You MAY mention identifiers that already exist in the student's code in backticks (like `total`) and refer to line numbers.
6. If the student asks for the answer, kindly refuse in a few words and ask a smaller, easier question instead.
7. If the student goes off-topic, gently steer back to the bug.

METHOD (move through phases as the student makes progress):
- understand: get them to say what the code SHOULD do vs. what it ACTUALLY does, with a concrete input.
- narrow: have them pick a small input, predict a variable's value at a specific line, and compare the prediction with reality.
- pinpoint: direct attention to the suspicious region by asking about specific lines or values. Still only questions.
- celebrate: when the student has correctly named the cause AND the fix in their own words, congratulate them briefly and ask them to explain why it works.

HINT LEVEL (given each turn, 1-3):
1 = broad, open questions.
2 = steer toward the relevant function or block.
3 = point at the exact line and ask about the exact value or condition there. Even at level 3, NEVER give the fix.

Use the student's own words. If they reveal a misconception, ask a question that makes them test it. If they say something correct, acknowledge it in one or two words, then go one step deeper.

Return JSON:
- reply: the message Quack sends to the student.
- focus_lines: [start, end] 1-based line numbers the student should look at right now, or [] if none.
- phase: one of understand, narrow, pinpoint, celebrate.
- insight: if the student's LATEST message showed a genuine realization, summarize it in 10 words or fewer in second person (e.g. "You noticed the loop starts at index 1"); otherwise "".
"""

DEBRIEF_PROMPT = """You are Quack, a friendly rubber-duck debugging coach. The student just fixed their bug on their own through a Socratic conversation. Write a short learning debrief.

The bug is solved now, so you may describe the cause and the fix in plain words, but do NOT include code blocks.

Return JSON:
- concept: the name of the underlying programming concept or bug pattern (2-5 words, e.g. "Off-by-one error").
- what_happened: 2 sentences: what was wrong and how the student found it.
- you_did_well: 1 sentence praising a specific debugging move the student made.
- takeaways: exactly 3 short, reusable lessons (under 14 words each).
- next_time: one question the student should ask themselves next time they see a similar bug.
"""

TURN_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "reply": {"type": "STRING"},
        "focus_lines": {"type": "ARRAY", "items": {"type": "INTEGER"}},
        "phase": {"type": "STRING", "enum": list(PHASES)},
        "insight": {"type": "STRING"},
    },
    "required": ["reply", "focus_lines", "phase", "insight"],
}

DEBRIEF_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "concept": {"type": "STRING"},
        "what_happened": {"type": "STRING"},
        "you_did_well": {"type": "STRING"},
        "takeaways": {"type": "ARRAY", "items": {"type": "STRING"}},
        "next_time": {"type": "STRING"},
    },
    "required": ["concept", "what_happened", "you_did_well", "takeaways", "next_time"],
}


def number_lines(code: str) -> str:
    lines = code.splitlines() or [""]
    width = len(str(len(lines)))
    return "\n".join(f"{i:>{width}}| {line}" for i, line in enumerate(lines, 1))


def build_context(code: str, language: str, error_output: str, hint_level: int, message: str) -> str:
    parts = [
        f"[Context - hint level: {hint_level}]",
        f"Language: {language or 'unknown'}",
        "Code (with line numbers):",
        number_lines(code) if code.strip() else "(no code provided yet)",
    ]
    if error_output.strip():
        parts += ["Error / output the student is seeing:", error_output.strip()[:3000]]
    parts.append(f'Student said: "{message.strip()}"')
    return "\n".join(parts)


# --------------------------------------------------------------------------- #
# Guardrail: make sure the duck never hands over the answer
# --------------------------------------------------------------------------- #
FIX_PATTERNS = [
    (r"\b(change|replace|rewrite|swap|switch|turn)\b[^?.!]{0,60}\b(to|with|into)\b", "tells the student what to change"),
    (r"\bthe (fix|solution|answer|bug|problem|issue|mistake|error) (is|was)\b", "announces the bug or fix"),
    (r"\byou (should|need to|have to|must|could just) (use|change|add|remove|write|replace|set|move|put|delete|return|initiali[sz]e|start)\b", "instructs a fix"),
    (r"\b(just|simply) (use|change|add|remove|write|replace|set|start)\b", "instructs a fix"),
    (r"\btry (using|changing|adding|removing|writing|replacing|setting|starting)\b", "suggests a specific fix"),
    (r"\b(use|using|used|write|writing|put)\b[^?.!]{0,40}\binstead of\b", "suggests a replacement"),
]
CODE_CHARS = re.compile(r"[=()\[\]{}<>+\-*/%;:]")
EXPR_PATTERN = re.compile(r"[\w\]\)]+\s*(==|!=|<=|>=|\+=|-=|=>|=)\s*[\w\[\(\"'-]+")


def _squash(text: str) -> str:
    return re.sub(r"\s+", "", text).lower()


def check_reply(reply: str, phase: str, code: str) -> list[str]:
    """Return a list of rule violations (empty list means the reply is safe)."""
    problems: list[str] = []
    text = reply.strip()
    if not text:
        return ["empty reply"]
    code_sq = _squash(code)

    if "```" in text:
        problems.append("contains a code block")

    code_like_lines = [ln for ln in text.splitlines()[1:] if CODE_CHARS.search(ln)]
    if len(code_like_lines) >= 2:
        problems.append("contains multi-line code")

    for span in re.findall(r"`([^`]+)`", text):
        sq = _squash(span)
        if len(sq) > 3 and CODE_CHARS.search(span) and sq not in code_sq:
            problems.append(f"writes new code: `{span}`")

    plain = re.sub(r"`[^`]*`", " ", text)
    for match in EXPR_PATTERN.finditer(plain):
        if _squash(match.group(0)) not in code_sq:
            problems.append(f"writes a new expression: {match.group(0)}")

    for pattern, label in FIX_PATTERNS:
        if re.search(pattern, plain, flags=re.IGNORECASE):
            problems.append(label)

    if phase != "celebrate" and "?" not in text:
        problems.append("does not ask a question")

    if len(text.split()) > 60:
        problems.append("too long")

    # de-duplicate, keep order
    return list(dict.fromkeys(problems))


def safe_fallback(focus: list[int], code: str) -> str:
    if focus:
        return (f"Let's slow down and trace it together. What do you expect the values to be on line {focus[0]}, "
                "and how could you check that?")
    return "Let's slow down. Can you walk me through what your code does, line by line, with one small input?"


# --------------------------------------------------------------------------- #
# Gemini
# --------------------------------------------------------------------------- #
class LLMError(RuntimeError):
    pass


def call_gemini(system: str, contents: list[dict], schema: dict, temperature: float = 0.6) -> dict:
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
            "responseSchema": schema,
        },
    }
    budget = os.environ.get("GEMINI_THINKING_BUDGET", "").strip()
    if budget.lstrip("-").isdigit():
        body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": int(budget)}

    payload = json.dumps(body).encode("utf-8")
    last_err = "unknown error"
    # Try the main model first, then fall back to others if it's overloaded or unavailable.
    for model in model_chain():
        for attempt in range(2):
            req = urllib.request.Request(
                GEMINI_URL.format(model=model),
                data=payload,
                headers={"Content-Type": "application/json", "x-goog-api-key": api_key()},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                parts = data["candidates"][0]["content"]["parts"]
                text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
                return json.loads(text)
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "ignore")[:300]
                last_err = f"Gemini HTTP {exc.code} ({model}): {detail}"
                if exc.code in (500, 502, 504) and attempt == 0:
                    time.sleep(0.8)
                    continue
                if exc.code in (400, 401, 403):
                    raise LLMError(last_err) from exc  # bad key/request: other models won't help
                break  # 404 / 429 / 503 -> next model
            except (urllib.error.URLError, TimeoutError) as exc:
                last_err = f"Network error talking to Gemini ({model}): {exc}"
                break
            except (KeyError, IndexError, json.JSONDecodeError) as exc:
                last_err = f"Unexpected Gemini response ({model}): {exc}"
                if attempt == 0:
                    continue
                break
    raise LLMError(last_err)


def model_chain() -> list[str]:
    fallbacks = os.environ.get("GEMINI_FALLBACK_MODELS", "gemini-3.1-flash-lite,gemini-3.8-flash,gemini-3.7-flash")
    chain = [model_name()] + [m.strip() for m in fallbacks.split(",") if m.strip()]
    return list(dict.fromkeys(chain))


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def _clean_focus(raw, code: str) -> list[int]:
    n = max(1, len(code.splitlines()))
    nums = [int(x) for x in (raw or []) if isinstance(x, (int, float))]
    nums = [min(max(1, x), n) for x in nums][:2]
    if not nums:
        return []
    if len(nums) == 1:
        nums.append(nums[0])
    return sorted(nums)


def _history_contents(history: list[dict]) -> list[dict]:
    contents = []
    for turn in history[-MAX_HISTORY_TURNS:]:
        text = str(turn.get("text", "")).strip()[:2000]
        if not text:
            continue
        role = "model" if turn.get("role") == "duck" else "user"
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n" + text
        else:
            contents.append({"role": role, "parts": [{"text": text}]})
    # Gemini wants the conversation to start with a user turn
    while contents and contents[0]["role"] == "model":
        contents.pop(0)
    return contents


def duck_turn(payload: dict) -> dict:
    code = str(payload.get("code", ""))[:MAX_CODE_CHARS]
    language = str(payload.get("language", ""))[:40]
    error_output = str(payload.get("error_output", ""))[:3000]
    message = str(payload.get("message", "")).strip()[:2000]
    history = payload.get("history") or []
    try:
        hint_level = min(3, max(1, int(payload.get("hint_level", 1))))
    except (TypeError, ValueError):
        hint_level = 1
    if not message:
        raise ValueError("Say something to the duck first!")

    if mode() == "demo":
        return demo_turn(code, history, hint_level)

    contents = _history_contents(history if isinstance(history, list) else [])
    if contents and contents[-1]["role"] == "user":
        contents.append({"role": "model", "parts": [{"text": "Mm-hm, go on?"}]})
    contents.append({"role": "user", "parts": [{"text": build_context(code, language, error_output, hint_level, message)}]})

    blocked: list[str] = []
    result: dict = {}
    for _ in range(3):
        result = call_gemini(SYSTEM_PROMPT, contents, TURN_SCHEMA)
        phase = result.get("phase") if result.get("phase") in PHASES else "understand"
        reply = str(result.get("reply", "")).strip()
        problems = check_reply(reply, phase, code)
        if not problems:
            break
        blocked.extend(problems)
        contents += [
            {"role": "model", "parts": [{"text": json.dumps(result)}]},
            {"role": "user", "parts": [{"text": (
                "GUARDRAIL CHECK FAILED: your last reply " + "; ".join(problems) +
                ". Rewrite it as ONE short Socratic question. No code, no fix, no instructions. Same JSON format.")}]},
        ]
    else:
        focus = _clean_focus(result.get("focus_lines"), code)
        result = {"reply": safe_fallback(focus, code), "focus_lines": focus, "phase": "narrow", "insight": ""}

    phase = result.get("phase") if result.get("phase") in PHASES else "understand"
    return {
        "reply": str(result.get("reply", "")).strip(),
        "focus_lines": _clean_focus(result.get("focus_lines"), code),
        "phase": phase,
        "insight": str(result.get("insight", "")).strip()[:120],
        "guard": {"blocked": len(blocked), "reasons": blocked},
        "mode": "live",
    }


def debrief(payload: dict) -> dict:
    code = str(payload.get("code", ""))[:MAX_CODE_CHARS]
    history = payload.get("history") or []
    if mode() == "demo":
        return demo_debrief()

    transcript = "\n".join(
        f"{'Duck' if t.get('role') == 'duck' else 'Student'}: {str(t.get('text', ''))[:600]}"
        for t in history[-30:] if isinstance(t, dict)
    )
    prompt = f"Final code:\n{number_lines(code)}\n\nConversation:\n{transcript}"
    result = call_gemini(DEBRIEF_PROMPT, [{"role": "user", "parts": [{"text": prompt}]}], DEBRIEF_SCHEMA, 0.4)
    result["takeaways"] = [str(t) for t in (result.get("takeaways") or [])][:3]
    result["mode"] = "live"
    return result


# --------------------------------------------------------------------------- #
# Demo mode (no API key): scripted but still Socratic, so the UI is testable
# --------------------------------------------------------------------------- #
DEMO_SCRIPT = [
    "Quack! Before we touch anything: what should this code do, and what is it doing instead?",
    "Let's make it concrete. If you run it with a tiny input, what output do you expect, and what do you actually get?",
    "Nice. Which line is the first place where a value could start going wrong?",
    "If you trace that line by hand with your tiny input, what value do you get on each pass?",
    "Does that match what you predicted earlier? What's different?",
    "So what would need to be true for the output to be correct?",
]


def _guess_focus(code: str) -> list[int]:
    for i, line in enumerate(code.splitlines(), 1):
        if re.search(r"\b(for|while|forEach|map|if)\b", line):
            return [i, i]
    return []


def demo_turn(code: str, history: list, hint_level: int) -> dict:
    student_turns = sum(1 for t in history if isinstance(t, dict) and t.get("role") != "duck")
    # The greeting already asked DEMO_SCRIPT[0], so start from the next question.
    idx = min(student_turns + hint_level, len(DEMO_SCRIPT) - 1)
    focus = _guess_focus(code) if idx >= 2 else []
    return {
        "reply": DEMO_SCRIPT[idx],
        "focus_lines": focus,
        "phase": "understand" if idx < 2 else ("narrow" if idx < 4 else "pinpoint"),
        "insight": "You described what's going wrong" if student_turns == 0 else "",
        "guard": {"blocked": 0, "reasons": []},
        "mode": "demo",
    }


def demo_debrief() -> dict:
    return {
        "concept": "Tracing values by hand",
        "what_happened": "You compared what you expected with what actually happened, then traced the code until the two disagreed. That gap is where the bug lived.",
        "you_did_well": "You made a concrete prediction before running anything, which is exactly what good debuggers do.",
        "takeaways": [
            "Always state expected vs. actual output first.",
            "Use the smallest input that still shows the bug.",
            "Trace one variable at a time, line by line.",
        ],
        "next_time": "What is the first line where reality stops matching my prediction?",
        "mode": "demo",
    }
