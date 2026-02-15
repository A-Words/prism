from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chains.grading_chain import run_grading_chain
from app.chains.prediction_chain import run_prediction_chain
from app.providers.openrouter_client import OpenAICompatibleClient, ProviderError
from app.schemas import (
    HomeworkGradeRequest,
    HomeworkGradeResponse,
    PredictOutcomeRequest,
    PredictOutcomeResponse,
)

router = APIRouter(prefix="/assessment", tags=["assessment"])


@router.post("/grade-homework", response_model=HomeworkGradeResponse)
def grade_homework(request: HomeworkGradeRequest) -> HomeworkGradeResponse:
    try:
        client = OpenAICompatibleClient()
        return run_grading_chain(client, request.subject, request.ocr_text)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/predict-outcome", response_model=PredictOutcomeResponse)
def predict_outcome(request: PredictOutcomeRequest) -> PredictOutcomeResponse:
    try:
        client = OpenAICompatibleClient()
        return run_prediction_chain(client, request)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
