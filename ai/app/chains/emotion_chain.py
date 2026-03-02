from __future__ import annotations

from pydantic import BaseModel

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import EmotionAnalyzeResponse


class EmotionResult(BaseModel):
    emotion: str
    confidence: float
    details: dict[str, object]


def run_emotion_chain(
    client: OpenAICompatibleClient, image_base64: str, audio_base64: str | None
) -> EmotionAnalyzeResponse:
    """分析学生面部表情（可选音频），返回情绪类别与置信度。"""
    system_prompt = (
        "你是教育场景情绪识别助手。"
        "根据学生面部图像分析当前情绪状态。"
        "emotion 只能是以下之一：focused, confused, anxious, frustrated, tired。"
        "confidence 为 0.0-1.0 之间的浮点数。"
        "details 包含分析依据的关键特征。"
    )
    user_prompt = f"image_base64=\n{image_base64[:8000]}\n"
    if audio_base64:
        user_prompt += f"audio_base64=\n{audio_base64[:4000]}\n"
    user_prompt += "请输出 JSON，包含 emotion, confidence, details 字段。"

    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=EmotionResult,
        vision=True,
    )
    parsed = EmotionResult.model_validate(result)
    return EmotionAnalyzeResponse(
        emotion=parsed.emotion,
        confidence=parsed.confidence,
        details=parsed.details,
    )
