from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chains.emotion_chain import run_emotion_chain
from app.chains.pose_chain import run_pose_chain
from app.providers.openrouter_client import OpenAICompatibleClient, ProviderError
from app.schemas import (
    EmotionAnalyzeRequest,
    EmotionAnalyzeResponse,
    PoseAnalyzeRequest,
    PoseAnalyzeResponse,
)

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/emotion", response_model=EmotionAnalyzeResponse)
def analyze_emotion(request: EmotionAnalyzeRequest) -> EmotionAnalyzeResponse:
    """分析学生面部表情，识别情绪状态。"""
    try:
        client = OpenAICompatibleClient()
        return run_emotion_chain(client, request.image, request.audio)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/pose", response_model=PoseAnalyzeResponse)
def analyze_pose(request: PoseAnalyzeRequest) -> PoseAnalyzeResponse:
    """分析学生坐姿，检测姿态异常。"""
    try:
        client = OpenAICompatibleClient()
        return run_pose_chain(client, request.image)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
