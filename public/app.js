(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    editor: $("editor"), fallback: $("fallbackEditor"), output: $("outputInput"),
    exampleSelect: $("exampleSelect"), languageSelect: $("languageSelect"),
    duck: $("duck"), status: $("statusText"),
    transcript: $("transcript"),
    hint: $("hintBtn"), fixed: $("fixedBtn"), textForm: $("textForm"), textInput: $("textInput"),
    insightList: $("insightList"), statCode: $("statCode"), statBlocked: $("statBlocked"), statQuestions: $("statQuestions"),
    modeBadge: $("modeBadge"), reset: $("resetBtn"),
    intro: $("intro"), start: $("startBtn"),
    debrief: $("debrief"), debriefBody: $("debriefBody"), closeDebrief: $("closeDebrief"), newBug: $("newBugBtn"),
    dTime: $("dTime"), dQuestions: $("dQuestions"), dHints: $("dHints"), toast: $("toast"),
  };

  const GREETING = "Hi, I'm Quack! I won't fix your code, but I'll help you find the bug yourself. " +
    "So, what is your code supposed to do, and what is it doing instead?";
  const STATUS = {
    idle: "Ready when you are",
    thinking: "Hmm, thinking of a good question…",
    celebrate: "You did it!",
  };

  const state = {
    history: [], hintLevel: 1, hintsUsed: 0, questions: 0, blocked: 0, insights: [],
    startedAt: null, busy: false, celebrated: false,
    sessionId: 0, requestController: null,
  };

  // ------------------------------------------------------------------ //
  // Helpers
  // ------------------------------------------------------------------ //
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const renderInline = (s) => escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");

  let toastTimer = null;
  function toast(msg, isError = false) {
    els.toast.textContent = msg;
    els.toast.classList.toggle("error", isError);
    els.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 4500);
  }

  function setDuck(mode) {
    els.duck.dataset.state = mode;
    els.status.textContent = STATUS[mode] || STATUS.idle;
  }

  async function api(path, body, signal) {
    const res = await fetch(path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
    });
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ------------------------------------------------------------------ //
  // Editor (Monaco with a plain textarea fallback)
  // ------------------------------------------------------------------ //
  let editor = null;
  let decorations = null;
  let usingFallback = false;

  function useFallback() {
    if (editor) return;
    usingFallback = true;
    els.editor.classList.add("hidden");
    els.fallback.classList.remove("hidden");
  }

  function initEditor() {
    return new Promise((resolve) => {
      if (typeof window.require === "undefined" || !window.require.config) { useFallback(); return resolve(); }
      const base = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min";
      window.MonacoEnvironment = {
        getWorkerUrl: () => `data:text/javascript;charset=utf-8,${encodeURIComponent(
          `self.MonacoEnvironment={baseUrl:'${base}/'};importScripts('${base}/vs/base/worker/workerMain.js');`)}`,
      };
      window.require.config({ paths: { vs: `${base}/vs` } });
      const timer = setTimeout(() => { useFallback(); resolve(); }, 9000);
      window.require(["vs/editor/editor.main"], () => {
        clearTimeout(timer);
        if (usingFallback) return resolve();
        monaco.editor.defineTheme("quack", {
          base: "vs-dark", inherit: true, rules: [],
          colors: {
            "editor.background": "#0b1020", "editorGutter.background": "#0b1020",
            "editor.lineHighlightBackground": "#ffffff08", "editorLineNumber.foreground": "#3b4763",
          },
        });
        editor = monaco.editor.create(els.editor, {
          value: "", language: "python", theme: "quack",
          fontFamily: "JetBrains Mono, Consolas, monospace", fontSize: 14, lineHeight: 22,
          minimap: { enabled: false }, glyphMargin: true, scrollBeyondLastLine: false,
          automaticLayout: true, padding: { top: 12, bottom: 12 }, smoothScrolling: true, tabSize: 4,
        });
        decorations = editor.createDecorationsCollection([]);
        resolve();
      }, () => { clearTimeout(timer); useFallback(); resolve(); });
    });
  }

  const code = {
    get: () => (editor ? editor.getValue() : els.fallback.value),
    set: (v) => { if (editor) editor.setValue(v); else els.fallback.value = v; },
    setLanguage: (lang) => { if (editor) monaco.editor.setModelLanguage(editor.getModel(), lang); },
    clearFocus: () => { if (decorations) decorations.clear(); },
    focus: (lines) => {
      if (!lines || lines.length !== 2) return;
      const [start, end] = lines;
      if (editor) {
        decorations.set([{
          range: new monaco.Range(start, 1, end, 1),
          options: { isWholeLine: true, className: "duck-focus-line", glyphMarginClassName: "duck-glyph" },
        }]);
        editor.revealLinesInCenterIfOutsideViewport(start, end);
      } else {
        const ls = els.fallback.value.split("\n");
        const from = ls.slice(0, start - 1).join("\n").length + (start > 1 ? 1 : 0);
        const to = ls.slice(0, end).join("\n").length;
        els.fallback.setSelectionRange(from, to);
      }
    },
  };

  // ------------------------------------------------------------------ //
  // Examples
  // ------------------------------------------------------------------ //
  function populateExamples() {
    for (const ex of window.QUACK_EXAMPLES) {
      const opt = document.createElement("option");
      opt.value = ex.id; opt.textContent = ex.title;
      els.exampleSelect.appendChild(opt);
    }
  }

  function loadExample(id) {
    const ex = window.QUACK_EXAMPLES.find((e) => e.id === id) || window.QUACK_EXAMPLES[0];
    els.exampleSelect.value = ex.id;
    els.languageSelect.value = ex.language;
    code.setLanguage(ex.language);
    code.set(ex.code);
    els.output.value = ex.output;
    code.clearFocus();
  }

  function changeLanguage(language) {
    const example = window.QUACK_EXAMPLES.find((item) => item.language === language && item.id !== "blank");
    if (example) {
      loadExample(example.id);
    } else {
      code.setLanguage(language);
      code.set(language === "html"
        ? "<!-- Choose an example or paste your HTML here. -->\n"
        : language === "python"
          ? "# Choose an example or paste your code here.\n"
          : "// Choose an example or paste your code here.\n");
      els.output.value = "";
      code.clearFocus();
    }
    resetSession();
  }

  // ------------------------------------------------------------------ //
  // Transcript / insights / stats
  // ------------------------------------------------------------------ //
  function addMessage(role, text, focus) {
    const li = document.createElement("li");
    li.className = `msg ${role}`;
    li.innerHTML = renderInline(text);
    if (role === "duck" && focus && focus.length === 2) {
      const meta = document.createElement("span");
      meta.className = "meta";
      const btn = document.createElement("button");
      btn.className = "lines-link";
      btn.textContent = focus[0] === focus[1] ? `👀 line ${focus[0]}` : `👀 lines ${focus[0]}–${focus[1]}`;
      btn.addEventListener("click", () => code.focus(focus));
      meta.appendChild(btn);
      li.appendChild(meta);
    }
    els.transcript.appendChild(li);
    els.transcript.scrollTop = els.transcript.scrollHeight;
    return li;
  }

  function showTyping() {
    const li = document.createElement("li");
    li.className = "msg duck typing";
    li.innerHTML = "<span>●</span> <span>●</span> <span>●</span>";
    els.transcript.appendChild(li);
    els.transcript.scrollTop = els.transcript.scrollHeight;
    return li;
  }

  function addInsight(text) {
    if (!text || state.insights.includes(text)) return;
    state.insights.push(text);
    const empty = els.insightList.querySelector(".empty");
    if (empty) empty.remove();
    const li = document.createElement("li");
    li.textContent = text;
    els.insightList.appendChild(li);
  }

  function updateStats() {
    els.statCode.textContent = "0";
    els.statBlocked.textContent = String(state.blocked);
    els.statQuestions.textContent = String(state.questions);
    els.hint.querySelectorAll(".hint-dots i").forEach((dot, i) => dot.classList.toggle("on", i < state.hintLevel));
  }

  function setBusy(busy) {
    state.busy = busy;
    els.hint.disabled = busy;
    els.textInput.disabled = busy;
  }

  // ------------------------------------------------------------------ //
  // Talking to the duck
  // ------------------------------------------------------------------ //
  async function sendToDuck(text, { hint = false } = {}) {
    text = (text || "").trim();
    if (!text || state.busy) return;
    if (!state.startedAt) state.startedAt = Date.now();
    const sessionId = state.sessionId;
    const controller = new AbortController();
    state.requestController = controller;

    addMessage("student", text);
    setBusy(true);
    setDuck("thinking");
    const typing = showTyping();

    try {
      const data = await api("/api/duck", {
        code: code.get(),
        language: els.languageSelect.value,
        error_output: els.output.value,
        history: state.history.slice(-16),
        message: text,
        hint_level: state.hintLevel,
      }, controller.signal);
      if (sessionId !== state.sessionId) return;
      typing.remove();
      state.history.push({ role: "student", text }, { role: "duck", text: data.reply });
      addMessage("duck", data.reply, data.focus_lines);
      if (data.reply.includes("?")) state.questions += 1;
      state.blocked += (data.guard && data.guard.blocked) || 0;
      if (data.focus_lines && data.focus_lines.length === 2) code.focus(data.focus_lines);
      addInsight(data.insight);
      updateStats();

      const celebrate = data.phase === "celebrate";
      if (celebrate && !state.celebrated) {
        state.celebrated = true;
        els.fixed.classList.add("pulse");
      }
      setDuck(celebrate ? "celebrate" : "idle");
    } catch (err) {
      if (sessionId !== state.sessionId || err.name === "AbortError") return;
      typing.remove();
      setDuck("idle");
      toast(err.message || "Couldn't reach the duck.", true);
      if (hint) { state.hintLevel = Math.max(1, state.hintLevel - 1); updateStats(); }
    } finally {
      if (sessionId === state.sessionId) {
        state.requestController = null;
        setBusy(false);
      }
    }
  }

  // ------------------------------------------------------------------ //
  // Debrief
  // ------------------------------------------------------------------ //
  function formatDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  async function openDebrief() {
    if (!state.history.some((t) => t.role === "student")) {
      toast("Talk to the duck about your bug first!");
      return;
    }
    els.dTime.textContent = formatDuration(Date.now() - (state.startedAt || Date.now()));
    els.dQuestions.textContent = String(state.questions);
    els.dHints.textContent = String(state.hintsUsed);
    els.debriefBody.innerHTML = '<div class="loading-line"></div><div class="loading-line short"></div><div class="loading-line"></div>';
    els.debrief.classList.remove("hidden");
    setDuck("celebrate");
    setTimeout(() => { if (els.duck.dataset.state === "celebrate") setDuck("idle"); }, 1800);

    try {
      const d = await api("/api/debrief", { code: code.get(), history: state.history });
      els.debriefBody.innerHTML = `
        <h3>The concept</h3>
        <span class="concept">${escapeHtml(d.concept || "")}</span>
        <h3>What happened</h3>
        <p>${renderInline(d.what_happened || "")}</p>
        <h3>What you did well</h3>
        <p>${renderInline(d.you_did_well || "")}</p>
        <h3>Takeaways</h3>
        <ul>${(d.takeaways || []).map((t) => `<li>${renderInline(t)}</li>`).join("")}</ul>
        <h3>Ask yourself next time</h3>
        <p class="next-time">“${renderInline(d.next_time || "")}”</p>`;
    } catch (err) {
      els.debriefBody.innerHTML = `<p>Couldn't generate the debrief (${escapeHtml(err.message)}). You still fixed it, and that's the part that counts.</p>`;
    }
  }

  // ------------------------------------------------------------------ //
  // Session
  // ------------------------------------------------------------------ //
  function resetSession({ greet = true } = {}) {
    state.sessionId += 1;
    if (state.requestController) state.requestController.abort();
    state.requestController = null;
    setBusy(false);
    Object.assign(state, { history: [], hintLevel: 1, hintsUsed: 0, questions: 0, blocked: 0, insights: [], startedAt: null, celebrated: false });
    els.transcript.innerHTML = "";
    els.insightList.innerHTML = '<li class="empty">Your realizations will collect here as you debug.</li>';
    els.fixed.classList.remove("pulse");
    code.clearFocus();
    updateStats();
    setDuck("idle");
    if (greet) {
      state.history.push({ role: "duck", text: GREETING });
      addMessage("duck", GREETING);
    }
  }

  async function checkHealth() {
    try {
      const res = await fetch("/api/health");
      const h = await res.json();
      if (h.mode === "live") {
        els.modeBadge.textContent = "● Live AI";
        els.modeBadge.className = "badge live";
        els.modeBadge.title = `Model: ${h.model}`;
      } else {
        els.modeBadge.textContent = "● Demo mode (no API key)";
        els.modeBadge.className = "badge demo";
        els.modeBadge.title = "Set GEMINI_API_KEY to enable the real duck brain";
      }
    } catch {
      els.modeBadge.textContent = "● Offline";
      els.modeBadge.className = "badge off";
    }
  }

  // ------------------------------------------------------------------ //
  // Wire up
  // ------------------------------------------------------------------ //
  function bindEvents() {
    els.textForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = els.textInput.value;
      els.textInput.value = "";
      sendToDuck(t);
    });

    els.hint.addEventListener("click", () => {
      state.hintLevel = Math.min(3, state.hintLevel + 1);
      state.hintsUsed += 1;
      updateStats();
      sendToDuck("I'm stuck. Can you give me a more specific question?", { hint: true });
    });

    els.fixed.addEventListener("click", openDebrief);
    els.closeDebrief.addEventListener("click", () => els.debrief.classList.add("hidden"));
    els.newBug.addEventListener("click", () => {
      els.debrief.classList.add("hidden");
      loadExample("blank");
      resetSession();
    });

    els.reset.addEventListener("click", () => resetSession());

    els.exampleSelect.addEventListener("change", () => {
      loadExample(els.exampleSelect.value);
      resetSession();
    });
    els.languageSelect.addEventListener("change", () => changeLanguage(els.languageSelect.value));

    els.start.addEventListener("click", () => {
      els.intro.classList.add("hidden");
      resetSession();
    });

    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && !els.debrief.classList.contains("hidden")) els.debrief.classList.add("hidden");
    });
  }

  async function boot() {
    populateExamples();
    bindEvents();
    updateStats();
    checkHealth();
    await initEditor();
    loadExample("average");
  }

  boot();
})();
