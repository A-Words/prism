from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chains.ocr_chain import run_ocr_chain
from app.providers.openrouter_client import OpenAICompatibleClient, ProviderError
from app.schemas import VisionOCRRequest, VisionOCRResponse

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/ocr", response_model=VisionOCRResponse)
def vision_ocr(request: VisionOCRRequest) -> VisionOCRResponse:
    try:
        client = OpenAICompatibleClient()
        return run_ocr_chain(client, request.image, request.task)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
