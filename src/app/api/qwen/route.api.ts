// Dev-server-only relay queue between the wizard and the qwen-relay script
// running inside a logged-in chat.qwen.ai tab. chat.qwen.ai sits behind
// Alibaba's edge anti-bot (Baxia) which rejects Node-made completion calls,
// so the actual inference is issued by the browser tab's own JS and this
// handler only shuttles prompt/result between the two pages.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";


export interface RelayJob {
  id: string;
  prompt: string;
  state: "pending" | "claimed" | "done" | "error";
  text: string;
  error?: string;
  updatedAt: number;
}

declare global {
  // Dev HMR re-evaluates this module; the queue must outlive module reloads.
  var __shushuQwen:
    | { jobs: Map<string, RelayJob>; lastRelayPing: number; seq: number }
    | undefined;
}

const g = (globalThis.__shushuQwen ??= { jobs: new Map<string, RelayJob>(), lastRelayPing: 0, seq: 0 });

// The relay runs on https://chat.qwen.ai (public origin) against this local
// dev server, so it needs CORS plus the Private-Network preamble.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-allow-private-network": "true",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const op = req.nextUrl.searchParams.get("op");
  const staleBefore = Date.now() - 5 * 60_000;
  for (const [id, job] of g.jobs) if (job.updatedAt < staleBefore) g.jobs.delete(id);

  if (op === "next") {
    g.lastRelayPing = Date.now(); // the 1.5s claim poll doubles as the heartbeat
    const job = [...g.jobs.values()].find((j) => j.state === "pending");
    if (!job) return NextResponse.json({ job: null }, { headers: CORS });
    job.state = "claimed";
    return NextResponse.json({ job: { id: job.id, prompt: job.prompt } }, { headers: CORS });
  }
  if (op === "poll") {
    const job = g.jobs.get(req.nextUrl.searchParams.get("id") ?? "");
    return NextResponse.json(
      job ? { state: job.state, text: job.text, error: job.error } : { state: "gone" },
      { headers: CORS }
    );
  }
  if (op === "relay") {
    return NextResponse.json({ online: Date.now() - g.lastRelayPing < 15_000 }, { headers: CORS });
  }
  if (op === "script") {
    // Qwen's page patches fetch and blocks opaque static loads from public
    // origins; serving the relay source through this route gives it the
    // same CORS+PNA headers as the queue calls.
    const body = await readFile(join(process.cwd(), "public", "qwen-relay.js"), "utf8");
    return new Response(body, {
      headers: { "content-type": "application/javascript; charset=utf-8", ...CORS },
    });
  }
  return NextResponse.json({ error: `unknown op: ${op}` }, { status: 400, headers: CORS });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    op?: string;
    prompt?: string;
    id?: string;
    text?: string;
    error?: string;
    done?: boolean;
  } | null;
  if (!body || typeof body.op !== "string") {
    return NextResponse.json({ error: "bad body" }, { status: 400, headers: CORS });
  }

  if (body.op === "queue" && typeof body.prompt === "string" && body.prompt.trim()) {
    const id = `j${++g.seq}`;
    g.jobs.set(id, { id, prompt: body.prompt, state: "pending", text: "", updatedAt: Date.now() });
    return NextResponse.json({ id }, { headers: CORS });
  }
  if (body.op === "result") {
    const job = g.jobs.get(String(body.id ?? ""));
    if (job) {
      if (typeof body.text === "string") job.text = body.text;
      if (body.error) {
        job.state = "error";
        job.error = String(body.error);
      } else if (body.done) {
        job.state = "done";
      }
      job.updatedAt = Date.now();
    }
    return NextResponse.json({ ok: Boolean(job) }, { headers: CORS });
  }
  if (body.op === "ping") {
    g.lastRelayPing = Date.now();
    return NextResponse.json({ ok: true }, { headers: CORS });
  }
  return NextResponse.json({ error: `unknown op: ${body.op}` }, { status: 400, headers: CORS });
}
