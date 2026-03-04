import type {
  ApiSuccessEnvelope,
  InterventionEvent,
  KnowledgeOutlineJSON,
  NoteSection,
  VisionStateJSON,
} from "@prism/contracts";
import { useSessionStore } from "../store/useSessionStore";
import { supabase } from "./supabase";

const baseURL = import.meta.env.VITE_BFF_BASE_URL ?? "http://127.0.0.1:8787";

export class ApiError extends Error {
  code: string;
  retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const payload = await res.json();
  if (!res.ok) {
    throw new ApiError(payload?.error?.code ?? "UNKNOWN", payload?.error?.message ?? "Request failed", payload?.error?.retryable ?? false);
  }
  return (payload as ApiSuccessEnvelope<T>).data;
}

async function withAuthRetry(input: string, init: RequestInit, token?: string): Promise<Response> {
  const execute = (candidate?: string) =>
    fetch(`${baseURL}${input}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(candidate ? { Authorization: `Bearer ${candidate}` } : {}),
      },
    });

  let res = await execute(token);
  if (res.status !== 401) {
    return res;
  }
  const payload = await res.clone().json().catch(() => null);
  if (payload?.error?.code !== "TOKEN_EXPIRED" || !supabase) {
    return res;
  }

  const refreshed = await supabase.auth.refreshSession();
  const nextToken = refreshed.data.session?.access_token ?? null;
  if (!nextToken) {
    useSessionStore.getState().clearSession();
    return res;
  }
  useSessionStore.getState().setSession({
    accessToken: nextToken,
    refreshToken: refreshed.data.session?.refresh_token ?? null,
    expiresAt: refreshed.data.session?.expires_at ?? null,
    userId: refreshed.data.session?.user.id ?? null,
  });
  res = await execute(nextToken);
  return res;
}

export async function exploreText(topic: string, token?: string): Promise<KnowledgeOutlineJSON> {
  const res = await withAuthRetry(
    "/api/v1/explore/text",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic, language: "zh-CN" }),
    },
    token,
  );
  return parseEnvelope<KnowledgeOutlineJSON>(res);
}

export async function exploreImage(file: File, token?: string): Promise<KnowledgeOutlineJSON> {
  const body = new FormData();
  body.append("file", file);

  const res = await withAuthRetry("/api/v1/explore/image", { method: "POST", body }, token);
  return parseEnvelope<KnowledgeOutlineJSON>(res);
}

export async function getNote(nodeId: string, token?: string): Promise<NoteSection> {
  const res = await withAuthRetry(`/api/v1/notes/${nodeId}`, { method: "GET" }, token);
  return parseEnvelope<NoteSection>(res);
}

export async function saveNote(nodeId: string, markdown: string, token?: string): Promise<NoteSection> {
  const res = await withAuthRetry(
    `/api/v1/notes/${nodeId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ markdown }),
    },
    token,
  );
  return parseEnvelope<NoteSection>(res);
}

export async function analyzeVision(consentEnabled: boolean, token?: string, frameDataURL?: string): Promise<VisionStateJSON> {
  const res = await withAuthRetry(
    "/api/v1/vision/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ consent_enabled: consentEnabled, frame_data_url: frameDataURL ?? "" }),
    },
    token,
  );
  return parseEnvelope<VisionStateJSON>(res);
}

export async function evaluateIntervention(vision: VisionStateJSON, token?: string): Promise<InterventionEvent | null> {
  const res = await withAuthRetry(
    "/api/v1/intervention/evaluate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vision_state: vision }),
    },
    token,
  );
  return parseEnvelope<InterventionEvent | null>(res);
}

export async function syncPush(token?: string): Promise<{ pushed: number }> {
  const res = await withAuthRetry("/api/v1/sync/push", { method: "POST" }, token);
  return parseEnvelope<{ pushed: number }>(res);
}

export async function syncPull(token?: string): Promise<{ pulled: number }> {
  const res = await withAuthRetry("/api/v1/sync/pull", { method: "POST" }, token);
  return parseEnvelope<{ pulled: number }>(res);
}
