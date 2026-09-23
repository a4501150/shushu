// shushu AI-解盘 relay — run inside a logged-in chat.qwen.ai tab (userscript,
// console paste, or the 盘 page's one-line loader). It polls the shushu dev
// server for queued prompts and issues the completion from this tab itself:
// same-origin browser JS clears chat.qwen.ai's edge anti-bot, which a Node
// proxy cannot (the Baxia bx-ua signature is single-use and token refresh
// needs their page runtime).
(() => {
  if (window.__shushuQwenRelay) return;
  window.__shushuQwenRelay = true;
  const APP = window.__SHUSHU_APP__ || "http://localhost:3001";

  async function claim() {
    const res = await fetch(`${APP}/api/qwen?op=next`);
    if (!res.ok) return null;
    return (await res.json()).job;
  }

  async function report(id, patch) {
    await fetch(`${APP}/api/qwen`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "result", id, ...patch }),
    }).catch(() => undefined);
  }

  async function runJob(job) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("此标签页未登录 chat.qwen.ai");
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      accept: "application/json",
      source: "web",
      version: "0.3.11",
      "x-request-id": crypto.randomUUID(),
    };
    const created = await fetch("/api/v2/chats/new", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "shushu 解盘", models: ["qwen3.7-plus"], chat_mode: "normal", chat_type: "t2t" }),
    }).then((r) => r.json());
    const chatId = created?.data?.id;
    if (!chatId) throw new Error("chats/new 失败");

    const ts = Math.floor(Date.now() / 1000);
    const res = await fetch(`/api/v2/chat/completions?chat_id=${chatId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        stream: true,
        version: "2.1",
        incremental_output: true,
        chatId,
        parentId: "",
        chat_id: chatId,
        chat_mode: "normal",
        model: "qwen3.7-plus",
        parent_id: null,
        messages: [
          {
            id: null,
            fid: crypto.randomUUID(),
            parentId: null,
            childrenIds: [],
            role: "user",
            content: job.prompt,
            user_action: "chat",
            files: [],
            timestamp: ts,
            models: ["qwen3.7-plus"],
            model: "",
            chat_type: "t2t",
            feature_config: {
              thinking_enabled: false,
              output_schema: "phase",
              research_mode: "normal",
              auto_thinking: false,
              thinking_mode: "Auto",
              thinking_format: "summary",
              auto_search: true,
            },
            extra: { meta: { subChatType: "t2t" } },
            sub_chat_type: "t2t",
            parent_id: null,
          },
        ],
        timestamp: ts + 1,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`completions HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    let lastReport = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5));
          const delta = ev.choices?.[0]?.delta;
          if (delta?.content && delta.phase === "answer") text += delta.content;
        } catch {
          /* keepalive/heartbeat lines */
        }
      }
      if (Date.now() - lastReport > 800) {
        lastReport = Date.now();
        await report(job.id, { text });
      }
    }
    await report(job.id, { text, done: true });
  }

  window.__shushuQwenRelayTimer && clearInterval(window.__shushuQwenRelayTimer);
  window.__shushuQwenRelayTimer = setInterval(async () => {
    try {
      const job = await claim();
      if (job) await runJob(job);
    } catch (e) {
      console.warn("[shushu relay]", e?.message ?? e);
    }
  }, 1500);
  console.log("[shushu relay] 已就绪，等待任务", APP);
})();
