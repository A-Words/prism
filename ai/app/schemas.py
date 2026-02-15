from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str


class VisionOCRRequest(BaseModel):
    image: str = Field(min_length=1)
    task: Literal["handwriting", "document", "formula"] = "handwriting"


class VisionOCRResponse(BaseModel):
    text: str
    structured: dict[str, Any]


class HomeworkGradeRequest(BaseModel):
    subject: str = Field(min_length=1)
    ocr_text: str = Field(min_length=1, alias="ocrText")


class HomeworkGradeItem(BaseModel):
    question: str
    student_answer: str = Field(alias="studentAnswer")
    correct_answer: str = Field(alias="correctAnswer")
    is_correct: bool = Field(alias="isCorrect")
    knowledge_ids: list[int] = Field(alias="knowledgeIds")
    feedback: str
    confidence: float


class HomeworkGradeResponse(BaseModel):
    items: list[HomeworkGradeItem]


class PredictOutcomeNode(BaseModel):
    knowledge_id: int = Field(alias="knowledgeId")
    title: str
    base_probability: float = Field(alias="baseProbability")


class PredictOutcomeRequest(BaseModel):
    subject: str
    overall_base_prob: float = Field(alias="overallBaseProb")
    nodes: list[PredictOutcomeNode]


class PredictOutcomeResponse(BaseModel):
    calibration_factor: float = Field(alias="calibrationFactor")
    rationale: str
