from __future__ import annotations

from pydantic import BaseModel

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import VisionOCRResponse


class OCRResult(BaseModel):
    text: str
    structured: dict[str, object]


def run_ocr_chain(client: OpenAICompatibleClient, image_base64: str, task: str) -> VisionOCRResponse:
    system_prompt = (
        "你是教育场景 OCR 引擎。"
        "请根据输入图像内容提取文本并返回 JSON，"
        "必须包含 text 与 structured 字段。"
    )
    user_prompt = (
        f"task={task}\n"
        "image_base64=\n"
        f"{image_base64[:8000]}\n"
        "请输出结构化字段: language, blocks, formulas。"
    )
    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=OCRResult,
        vision=True,
    )
    parsed = OCRResult.model_validate(result)
    return VisionOCRResponse(text=parsed.text, structured=parsed.structured)
