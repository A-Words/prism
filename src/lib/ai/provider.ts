import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type { ZodTypeAny, z } from "zod";
import { getModelConfig, isAIConfigured } from "@/lib/ai/context";

export class AIProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "AIProviderError";
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? error.cause.message : undefined;
    return cause && cause !== error.message
      ? `${error.message}: ${cause}`
      : error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export interface StructuredGenerationParams<TSchema extends ZodTypeAny> {
  system: string;
  prompt: string;
  schema: TSchema;
  temperature?: number;
  timeoutMs?: number;
}

export interface StructuredGenerationResult<T> {
  object: T;
  provider: string;
  model: string;
}

export interface AIProvider {
  readonly providerName: string;
  readonly modelId: string;
  isConfigured(): boolean;
  generateStructured<TSchema extends ZodTypeAny>(
    params: StructuredGenerationParams<TSchema>
  ): Promise<StructuredGenerationResult<z.infer<TSchema>>>;
}

class OpenAICompatibleProvider implements AIProvider {
  readonly providerName = "openai-compatible";
  readonly modelId: string;
  private readonly client;

  constructor() {
    const config = getModelConfig();
    this.modelId = config.model;
    this.client = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      compatibility: "compatible",
      name: this.providerName,
    });
  }

  isConfigured() {
    return isAIConfigured();
  }

  async generateStructured<TSchema extends ZodTypeAny>({
    system,
    prompt,
    schema,
    temperature = 0.3,
    timeoutMs = 20_000,
  }: StructuredGenerationParams<TSchema>): Promise<
    StructuredGenerationResult<z.infer<TSchema>>
  > {
    if (!this.isConfigured()) {
      throw new AIProviderError("OPENAI_API_KEY is not configured");
    }

    let timer: NodeJS.Timeout | undefined;

    try {
      const result = await Promise.race([
        generateObject({
          model: this.client(this.modelId),
          mode: "json",
          schema,
          system,
          prompt,
          temperature,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(
              new AIProviderError(`AI generation timed out after ${timeoutMs}ms`)
            );
          }, timeoutMs);
        }),
      ]);

      if (timer) {
        clearTimeout(timer);
      }

      return {
        object: result.object,
        provider: this.providerName,
        model: this.modelId,
      };
    } catch (error) {
      if (timer) {
        clearTimeout(timer);
      }
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new AIProviderError(`AI generation failed: ${describeError(error)}`, {
        cause: error,
      });
    }
  }
}

let cachedProvider: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = new OpenAICompatibleProvider();
  }
  return cachedProvider;
}
