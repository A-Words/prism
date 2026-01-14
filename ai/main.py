from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Prism AI Service")


class HealthResponse(BaseModel):
    status: str
    service: str


class EmotionRequest(BaseModel):
    image: Optional[str] = None
    image_url: Optional[str] = None


class EmotionResponse(BaseModel):
    emotion: str
    confidence: float


@app.get("/")
def read_root():
    """根路径 - Hello World"""
    return {
        "message": "Hello World from Prism AI",
        "service": "Python FastAPI with LangChain",
    }


@app.get("/health", response_model=HealthResponse)
def health_check():
    """健康检查端点"""
    return HealthResponse(
        status="ok",
        service="AI Service"
    )


@app.post("/predict/emotion", response_model=EmotionResponse)
def predict_emotion(request: EmotionRequest):
    """
    情绪预测端点 (占位符实现)
    
    接收图像数据，返回情绪分析结果
    """
    # 占位符实现 - 返回模拟数据
    return EmotionResponse(
        emotion="neutral",
        confidence=0.85
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
