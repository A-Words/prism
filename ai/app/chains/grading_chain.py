from __future__ import annotations

from pydantic import BaseModel, Field

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import HomeworkGradeResponse


class GradeItem(BaseModel):
    question: str
    studentAnswer: str
    correctAnswer: str
    isCorrect: bool
    knowledgeIds: list[int]
    feedback: str
    confidence: float


class GradeResult(BaseModel):
    items: list[GradeItem] = Field(default_factory=list)


def run_grading_chain(client: OpenAICompatibleClient, subject: str, ocr_text: str) -> HomeworkGradeResponse:
    system_prompt = (
        "你是教育测评批改助手。"
        "仅对客观题和填空题给出判定。"
        "若题目不完整，仍需返回保守结果并降低 confidence。"
    )
    user_prompt = (
        f"subject={subject}\n"
        "ocr_text=\n"
        f"{ocr_text[:12000]}\n"
        "请输出 items 数组，每项含 question, studentAnswer, correctAnswer, isCorrect, knowledgeIds, feedback, confidence。"
    )
    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=GradeResult,
    )
    parsed = GradeResult.model_validate(result)
    return HomeworkGradeResponse.model_validate({"items": [item.model_dump(by_alias=True) for item in parsed.items]})
