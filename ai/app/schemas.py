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


# ─── 情绪分析 ───

class EmotionAnalyzeRequest(BaseModel):
    image: str = Field(min_length=1)
    audio: str | None = None


class EmotionAnalyzeResponse(BaseModel):
    emotion: str
    confidence: float
    details: dict[str, Any]


# ─── 姿态估计 ───

class PoseAnalyzeRequest(BaseModel):
    image: str = Field(min_length=1)


class PoseAnalyzeResponse(BaseModel):
    posture_status: str = Field(alias="postureStatus")
    confidence: float
    details: dict[str, Any]


# ─── 对话补全 ───

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatCompletionRequest(BaseModel):
    messages: list[ChatMessage]
    scene: str | None = None
    knowledge_context: str | None = Field(default=None, alias="knowledgeContext")


class ChatCompletionResponse(BaseModel):
    content: str
    related_knowledge_ids: list[int] = Field(default_factory=list, alias="relatedKnowledgeIds")


# ─── 语音转写 ───

class TranscribeRequest(BaseModel):
    audio: str = Field(min_length=1)
    format: str = "webm"


class TranscribeResponse(BaseModel):
    text: str


# ─── 向量嵌入 ───

class EmbedRequest(BaseModel):
    text: str = Field(min_length=1)


class EmbedResponse(BaseModel):
    embedding: list[float]


# ─── 语义搜索 ───

class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, alias="topK")


class SearchResultItem(BaseModel):
    id: int
    title: str
    content: str
    score: float
    source: str = Field(default="knowledge_point")

class SearchResponse(BaseModel):
    results: list[SearchResultItem]
