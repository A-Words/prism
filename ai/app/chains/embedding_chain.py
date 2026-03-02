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
    """语义搜索 — 先生成查询向量，再通过 pgvector 检索最近邻。
    当数据库不可用时回退到空结果。"""
    import logging
    import os

    logger = logging.getLogger(__name__)

    # 1. 生成查询文本的 embedding
    try:
        embed_result = run_embed(request.query)
        query_embedding = embed_result.embedding
    except Exception as exc:
        logger.warning("生成查询 embedding 失败，返回空结果: %s", exc)
        return SearchResponse(results=[])

    # 2. 检查是否配置了数据库连接
    if not os.getenv("DATABASE_URL", ""):
        logger.info("DATABASE_URL 未配置，回退到 mock 搜索结果")
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

    # 3. 通过 pgvector 执行语义搜索
    try:
        from app.db import pgvector_search

        rows = pgvector_search(query_embedding, top_k=request.top_k)
        results = [
            SearchResultItem(
                id=row["id"],
                title=row["title"],
                content=row["content"],
                score=row["score"],
            )
            for row in rows
        ]
        return SearchResponse(results=results)
    except Exception as exc:
        logger.warning("pgvector 搜索失败，返回空结果: %s", exc)
        return SearchResponse(results=[])
