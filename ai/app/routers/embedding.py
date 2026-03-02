from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chains.embedding_chain import run_embed, run_search
from app.providers.openrouter_client import ProviderError
from app.schemas import EmbedRequest, EmbedResponse, SearchRequest, SearchResponse

router = APIRouter(tags=["embedding"])


@router.post("/embed", response_model=EmbedResponse)
def embed_text(request: EmbedRequest) -> EmbedResponse:
    """生成文本的向量嵌入。"""
    try:
        return run_embed(request.text)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/search", response_model=SearchResponse)
def semantic_search(request: SearchRequest) -> SearchResponse:
    """语义搜索笔记/知识点。"""
    try:
        return run_search(request)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
