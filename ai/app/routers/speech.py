from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chains.transcribe_chain import run_transcribe_chain
from app.providers.openrouter_client import OpenAICompatibleClient, ProviderError
from app.schemas import TranscribeRequest, TranscribeResponse

router = APIRouter(prefix="/speech", tags=["speech"])


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(request: TranscribeRequest) -> TranscribeResponse:
    """将音频转写为文字。"""
    try:
        client = OpenAICompatibleClient()
        return run_transcribe_chain(client, request.audio, request.format)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
