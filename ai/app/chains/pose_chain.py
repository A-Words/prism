from __future__ import annotations

from pydantic import BaseModel

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import PoseAnalyzeResponse


class PoseResult(BaseModel):
    postureStatus: str
    confidence: float
    details: dict[str, object]


def run_pose_chain(
    client: OpenAICompatibleClient, image_base64: str
) -> PoseAnalyzeResponse:
    """分析学生坐姿，返回姿态状态与置信度。"""
    system_prompt = (
        "你是教育场景姿态检测助手。"
        "根据学生图像分析当前坐姿状态。"
        "postureStatus 只能是以下之一：good, slouching, too_close。"
        "confidence 为 0.0-1.0 之间的浮点数。"
        "details 包含检测到的关键姿态特征。"
    )
    user_prompt = (
        f"image_base64=\n{image_base64[:8000]}\n"
        "请输出 JSON，包含 postureStatus, confidence, details 字段。"
    )

    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=PoseResult,
        vision=True,
    )
    parsed = PoseResult.model_validate(result)
    return PoseAnalyzeResponse.model_validate(
        {
            "postureStatus": parsed.postureStatus,
            "confidence": parsed.confidence,
            "details": parsed.details,
        }
    )
