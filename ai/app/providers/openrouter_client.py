from __future__ import annotations

import json
import os
from typing import Any, Type

import httpx
from pydantic import BaseModel, ValidationError


class ProviderError(RuntimeError):
    pass


class OpenAICompatibleClient:
    def __init__(self) -> None:
        provider = os.getenv("AI_PROVIDER", "openrouter").strip().lower()
        self.provider = provider
        self.model_chat = os.getenv("MODEL_CHAT", "anthropic/claude-sonnet-4")
        self.model_vision = os.getenv("MODEL_VISION", self.model_chat)

        if provider == "openrouter":
            self.base_url = "https://openrouter.ai/api/v1"
            self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        elif provider == "openai":
            self.base_url = "https://api.openai.com/v1"
            self.api_key = os.getenv("OPENAI_API_KEY", "").strip()
        else:
            raise ProviderError(f"unsupported AI_PROVIDER: {provider}")

        if not self.api_key:
            raise ProviderError("missing API key for selected provider")

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[BaseModel],
        vision: bool = False,
    ) -> BaseModel:
        model_name = self.model_vision if vision else self.model_chat
        payload = {
            "model": model_name,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = os.getenv("OPENROUTER_REFERER", "https://prism.local")
            headers["X-Title"] = "Prism AI Service"

        last_error: Exception | None = None
        # 失败后最多重试一次，保证输出结构稳定。
        for _ in range(2):
            try:
                with httpx.Client(timeout=20.0) as client:
                    response = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if response.status_code >= 400:
                    raise ProviderError(f"provider status={response.status_code} body={response.text}")

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                if not isinstance(content, str):
                    raise ProviderError("provider content is not string")
                normalized = _strip_code_fence(content)
                parsed = json.loads(normalized)
                return response_model.model_validate(parsed)
            except (json.JSONDecodeError, KeyError, ValidationError, ProviderError, httpx.HTTPError) as exc:
                last_error = exc
                continue

        raise ProviderError(f"provider request failed after retry: {last_error}")


def _strip_code_fence(content: str) -> str:
    trimmed = content.strip()
    if trimmed.startswith("```"):
        lines = trimmed.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return trimmed
