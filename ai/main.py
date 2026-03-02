from fastapi import FastAPI

from app.routers.assessment import router as assessment_router
from app.routers.analyze import router as analyze_router
from app.routers.chat import router as chat_router
from app.routers.embedding import router as embedding_router
from app.routers.speech import router as speech_router
from app.routers.vision import router as vision_router
from app.schemas import HealthResponse

app = FastAPI(title="Prism AI Service")
app.include_router(vision_router)
app.include_router(assessment_router)
app.include_router(analyze_router)
app.include_router(chat_router)
app.include_router(speech_router)
app.include_router(embedding_router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": "Hello World from Prism AI",
        "service": "Python FastAPI with LangChain",
    }


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="AI Service")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
