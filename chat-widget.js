// בועת הצ'אט של אלון — מדברת עם ה-Chat Trigger של n8n (ספק §6.8).
// בלי ספריות. הפרוטוקול: POST {action:"sendMessage", sessionId, chatInput} -> {output}
(function () {
  "use strict";
  const CHAT_URL = "https://tamburai.app.n8n.cloud/webhook/cd2ec360-bbfa-41b2-936e-34a7f1bd65b2/chat";
  const STORE = "alonChatSession";
  const WELCOME = "שלום! אני העוזר הדיגיטלי של אלון. אפשר לשאול אותי על מחירים, זמני ייצור, תשלום ואחריות.";

  function sessionId() {
    let id = null;
    try { id = sessionStorage.getItem(STORE); } catch (e) {}
    if (!id) {
      id = "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem(STORE, id); } catch (e) {}
    }
    return id;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // Bot text is untrusted: build DOM nodes only. Supports **bold** and line breaks.
  function renderText(target, text) {
    String(text).split("\n").forEach((line, i) => {
      if (i) target.appendChild(document.createElement("br"));
      line.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) target.appendChild(el("strong", "", part.slice(2, -2)));
        else if (part) target.appendChild(document.createTextNode(part));
      });
    });
  }

  const toggle = el("button", "alon-chat-toggle");
  toggle.id = "alon-chat-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "alon-chat-panel");
  toggle.textContent = "שאלה על מחיר?";

  const panel = el("section", "alon-chat-panel");
  panel.id = "alon-chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "צ'אט עם העוזר של אלון");

  const head = el("header", "alon-chat-head");
  head.appendChild(el("span", "alon-chat-title", "העוזר של אלון"));
  const close = el("button", "alon-chat-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "סגירת הצ'אט");
  head.appendChild(close);

  const log = el("div", "alon-chat-log");
  log.id = "alon-chat-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  const form = el("form", "alon-chat-form");
  form.id = "alon-chat-form";
  const input = el("input", "alon-chat-input");
  input.id = "alon-chat-input";
  input.type = "text";
  input.autocomplete = "off";
  input.maxLength = 500;
  input.placeholder = "כתבו שאלה…";
  input.setAttribute("aria-label", "השאלה שלכם");
  const send = el("button", "alon-chat-send", "שליחה");
  send.type = "submit";
  form.append(input, send);

  panel.append(head, log, el("p", "alon-chat-note", "הבוט עונה לפי המחירון ותנאי ההזמנה. המחיר הסופי נקבע אחרי מדידה."), form);
  document.body.append(panel, toggle);

  function add(cls, text) {
    const m = el("div", "msg " + cls);
    renderText(m, text);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function addError() {
    const m = el("div", "msg msg-bot msg-error");
    m.appendChild(document.createTextNode("לא הצלחתי לענות כרגע. אפשר לנסות שוב, או להשאיר פרטים ב"));
    const a = el("a", "", "טופס הפנייה");
    a.href = "#pniya";
    a.addEventListener("click", () => setOpen(false));
    m.append(a, document.createTextNode(" ואלון יחזור אליכם."));
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.hidden = open;
    if (open) {
      if (!log.childElementCount) add("msg-bot", WELCOME);
      input.focus();
    } else {
      toggle.focus();
    }
  }

  let waiting = false;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text || waiting) return;
    waiting = true;
    send.disabled = true;
    input.value = "";
    add("msg-user", text);
    const typing = add("msg-bot msg-typing", "מקליד…");
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendMessage", sessionId: sessionId(), chatInput: text }),
      });
      const data = res.ok ? await res.json() : null;
      typing.remove();
      if (data && typeof data.output === "string" && data.output.trim()) add("msg-bot", data.output);
      else addError();
    } catch (e) {
      typing.remove();
      addError();
    } finally {
      waiting = false;
      send.disabled = false;
      input.focus();
    }
  });

  toggle.addEventListener("click", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !panel.hidden) setOpen(false);
  });
})();
