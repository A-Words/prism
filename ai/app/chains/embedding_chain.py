from __future__ import annotations

import os

import httpx

from app.providers.openrouter_client import ProviderError
from app.schemas import EmbedResponse, SearchRequest, SearchResponse, SearchResultItem


def run_embed(text: str) -> EmbedResponse:
    """调用 embedding 模型生成向量嵌入。"""
    provider = os.getenv("AI_PROVIDER", "openrouter").strip().lower()
    model = os.getenv("MODEL_EMBEDDING", "openai/text-embedding-3-small")

    if provider == "openrouter":
        base_url = "https://openrouter.ai/api/v1"
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    elif provider == "openai":
        base_url = "https://api.openai.com/v1"
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
    else:
        raise ProviderError(f"unsupported AI_PROVIDER for embedding: {provider}")

    if not api_key:
        raise ProviderError("missing API key for embedding")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = os.getenv("OPENROUTER_REFERER", "https://prism.local")
        headers["X-Title"] = "Prism AI Service"

    payload = {
        "model": model,
        "input": text[:8000],
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{base_url}/embeddings", headers=headers, json=payload
            )
        if response.status_code >= 400:
            raise ProviderError(
                f"embedding request failed: status={response.status_code}"
            )
        data = response.json()
        embedding = data["data"][0]["embedding"]
        return EmbedResponse(embedding=embedding)
    except (KeyError, httpx.HTTPError) as exc:
        raise ProviderError(f"embedding request failed: {exc}") from exc


def run_search(request: SearchRequest) -> SearchResponse:
    """语义搜索（演示版本：返回模拟结果，生产环境应查询 pgvector）。"""
    # 演示模式：返回基于查询的模拟搜索结果
    # 生产环境中应：1. embed query  2. 在 pgvector 中查询最近邻  3. 返回结果
    mock_results = [
        SearchResultItem(
            id=1,
            title=f"与「{request.query}」相关的知识点",
            content=f"这是一条与「{request.query}」高度相关的笔记内容。",
            score=0.95,
        ),
        SearchResultItem(
            id=2,
            title=f"「{request.query}」的扩展知识",
            content=f"这是关于「{request.query}」的补充说明和延伸阅读。",
            score=0.82,
        ),
    ]
    return SearchResponse(results=mock_results[: request.top_k])
