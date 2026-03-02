from __future__ import annotations

from pydantic import BaseModel

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import TranscribeResponse


class TranscribeResult(BaseModel):
    text: str


def run_transcribe_chain(
    client: OpenAICompatibleClient, audio_base64: str, audio_format: str
) -> TranscribeResponse:
    """将语音音频转写为文字（通过 LLM 模拟 Whisper 行为）。"""
    system_prompt = (
        "你是语音转文字引擎。"
        "将输入的音频内容转写为准确的中文文本。"
        "仅输出 JSON，包含 text 字段。"
        "如果无法识别，text 返回空字符串。"
    )
    user_prompt = (
        f"audio_format={audio_format}\n"
        f"audio_base64=\n{audio_base64[:8000]}\n"
        "请输出转写文本。"
    )

    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=TranscribeResult,
    )
    parsed = TranscribeResult.model_validate(result)
    return TranscribeResponse(text=parsed.text)
