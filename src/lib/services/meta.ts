import { nanoid } from "nanoid";
import type { ApiResponseMeta } from "@/types";

type MetaInput = Omit<ApiResponseMeta, "requestId"> & {
  requestId?: string;
};

export function createRequestId() {
  return nanoid(10);
}

export function buildMeta(input: MetaInput): ApiResponseMeta {
  return {
    requestId: input.requestId || createRequestId(),
    source: input.source,
    degraded: input.degraded,
    provider: input.provider,
    model: input.model,
    reason: input.reason,
  };
}

export function withMeta<T extends object>(payload: T, meta: ApiResponseMeta) {
  return {
    ...payload,
    meta,
  };
}
