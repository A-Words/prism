from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chains.chat_chain import run_chat_chain
from app.providers.openrouter_client import OpenAICompatibleClient, ProviderError
from app.schemas import ChatCompletionRequest, ChatCompletionResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completions", response_model=ChatCompletionResponse)
def chat_completions(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """基于对话历史生成虚拟助教回复。"""
    try:
        client = OpenAICompatibleClient()
        return run_chat_chain(client, request)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
