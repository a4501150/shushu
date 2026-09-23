"use client";

import { useEffect, useState } from "react";
import { buildLlmPrompt } from "@/lib/llm/prompt";
import { LIFE_ARTS, type ArtKind } from "@/lib/store/history";

interface BoardViewProps {
  art: ArtKind;
  question: string;
  boardText: string;
  artifacts: string;
  readingTime?: string;
  /** 附在盘面末尾、默认折叠的推演方法说明（五运六气） */
  methodText?: string;
}

const QWEN_STUDIO_URL = "https://chat.qwen.ai/";
const RELAY_MODEL_LABEL = "Qwen3.7-Plus";
const RELAY_LOADER =
  'fetch("http://localhost:3001/api/qwen?op=script").then(r=>r.text()).then(eval)';

// Static export has no route handlers: 解盘 degrades to a Qwen Studio link.
const isStatic = process.env.NEXT_PUBLIC_STATIC === "1";

interface AiState {
  status: "idle" | "running" | "error";
  text: string;
  err?: string;
}

async function pollInterpretation(
  id: string,
  onText: (text: string) => void,
  onClaimed?: () => void
): Promise<string> {
  for (;;) {
    await new Promise((res) => setTimeout(res, 700));
    const j = await (await fetch(`/api/qwen?op=poll&id=${encodeURIComponent(id)}`)).json();
    if (j.state === "done") return j.text ?? "";
    if (j.state === "error") throw new Error(j.error || "relay 执行失败");
    if (j.state === "gone") throw new Error("relay 任务已过期（relay 标签页未在线领取）");
    onClaimed?.();
    onText(j.text ?? "");
  }
}

export function BoardView({ art, question, boardText, artifacts, readingTime, methodText }: BoardViewProps) {
  const [copied, setCopied] = useState(false);
  const [ai, setAi] = useState<AiState>({ status: "idle", text: "" });
  const [relayOnline, setRelayOnline] = useState<boolean | null>(null);
  const prompt = buildLlmPrompt({ art, question: question || undefined, boardText, artifacts, readingTime });

  useEffect(() => {
    if (isStatic) return;
    fetch("/api/qwen?op=relay")
      .then((r) => r.json())
      .then((j) => setRelayOnline(Boolean(j.online)))
      .catch(() => setRelayOnline(false));
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const interpret = async () => {
    setAi({ status: "running", text: "" });
    try {
      const res = await fetch("/api/qwen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "queue", prompt }),
      });
      const { id } = await res.json();
      const text = await pollInterpretation(
        id,
        (t) => setAi({ status: "running", text: t }),
        () => setRelayOnline(true)
      );
      setAi({ status: "idle", text });
    } catch (e) {
      setAi({ status: "error", text: "", err: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <section className="board" aria-label="排盘结果">
      <h2 className="board-question">
        {question || (LIFE_ARTS.has(art) ? "本命解读" : "医道参考")}
      </h2>
      <pre className="board-text">{boardText}</pre>
      {readingTime && <p className="board-artifacts">占问时点：{readingTime}</p>}
      {artifacts && <p className="board-artifacts">{artifacts}</p>}
      <div className="board-actions">
        <button type="button" className="btn-cast" onClick={copy}>
          {copied ? "已复制" : "复制给 AI 解盘"}
        </button>
        {isStatic ? (
          <a className="ai-studio" href={QWEN_STUDIO_URL} target="_blank" rel="noreferrer">
            复制后在 Qwen Studio 中解盘
          </a>
        ) : (
          <>
            <button
              type="button"
              className="btn-cast"
              onClick={() => void interpret()}
              disabled={ai.status === "running"}
            >
              {ai.status === "running" ? "解盘中…" : "AI 解盘"}
            </button>
            {/* mirrors the model qwen-relay.js pins for the completion call */}
            <span className="ai-model">模型 {RELAY_MODEL_LABEL}</span>
            <a className="ai-studio" href={QWEN_STUDIO_URL} target="_blank" rel="noreferrer">
              Qwen Studio
            </a>
          </>
        )}
      </div>
      {!isStatic && (
        <div className="ai-panel">
          {relayOnline === false && (
            <p className="wizard-error">
              relay 未在线：在已登录 chat.qwen.ai 的标签页 Console 执行{" "}
              <code>{RELAY_LOADER}</code>
            </p>
          )}
          {ai.err && <p className="wizard-error">{ai.err}</p>}
          {ai.text && <pre className="board-text ai-answer">{ai.text}</pre>}
        </div>
      )}
      {methodText && (
        <details className="board-raw">
          <summary>五运六气推演方法</summary>
          <pre className="board-text board-text-prompt">{methodText}</pre>
        </details>
      )}
      <details className="board-raw">
        <summary>查看将复制的完整提示</summary>
        <pre className="board-text board-text-prompt">{prompt}</pre>
      </details>
    </section>
  );
}
