export type KnowledgeNode = {
  id: string;
  title: string;
  summary: string;
  level: number;
};

export type KnowledgeEdge = {
  source: string;
  target: string;
  relation: "contains" | "prerequisite" | "related";
};

export type KnowledgeOutlineJSON = {
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  source_type: "text" | "image";
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

export type NoteSection = {
  node_id: string;
  markdown: string;
  generated_by: "ai" | "user";
  updated_at: string;
};

export type ConsentState = {
  enabled: boolean;
  privacy_ack_version: string;
  updated_at: string;
};

export type VisionStateJSON = {
  focus_level: "low" | "medium" | "high";
  emotion: "neutral" | "frustrated" | "confused" | "engaged";
  posture: "normal" | "too_close" | "slouching";
  confidence: number;
  sampled_at: string;
};

export type InterventionEvent = {
  event_id: string;
  trigger_reason: "frustrated" | "posture" | "mixed";
  trigger_count: number;
  message: string;
  action_type: "explain_simpler" | "review_prerequisite" | "generate_variant";
  accepted: boolean | null;
  created_at: string;
};

export type OrbVisualState = "idle" | "active" | "intervene" | "cooldown";

export type AuthSessionState = {
  userId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
};

export type SyncQueueState = {
  pendingCount: number;
  inFlight: boolean;
  lastSyncAt: number | null;
  lastErrorCode?: string;
};

export type OfflineQueueEvent = {
  event_id: string;
  entity_type: "note_section" | "knowledge_node" | "session_meta";
  entity_id: string;
  op_type: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  version: number;
  idempotency_key: string;
  created_at: string;
};

export type RequestMeta = {
  requestId: string;
  queryKey: string[];
  source: "ui" | "background_sync";
  startedAt: number;
};

export type ApiSuccessEnvelope<T> = {
  request_id: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorEnvelope = {
  request_id: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};
