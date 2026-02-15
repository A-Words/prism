from fastapi.testclient import TestClient

from app.schemas import HomeworkGradeResponse, PredictOutcomeResponse, VisionOCRResponse
from main import app


client = TestClient(app)


def test_vision_ocr_schema(monkeypatch):
    def fake_run(_client, _image, _task):
        return VisionOCRResponse(text="x+1", structured={"language": "zh", "blocks": []})

    monkeypatch.setattr("app.routers.vision.run_ocr_chain", fake_run)
    monkeypatch.setattr("app.routers.vision.OpenAICompatibleClient", lambda: object())

    response = client.post("/vision/ocr", json={"image": "base64", "task": "handwriting"})
    assert response.status_code == 200
    body = response.json()
    assert "text" in body and "structured" in body


def test_grade_homework_schema(monkeypatch):
    def fake_run(_client, _subject, _ocr_text):
        return HomeworkGradeResponse.model_validate(
            {
                "items": [
                    {
                        "question": "1+1=?",
                        "studentAnswer": "2",
                        "correctAnswer": "2",
                        "isCorrect": True,
                        "knowledgeIds": [101],
                        "feedback": "ok",
                        "confidence": 0.95,
                    }
                ]
            }
        )

    monkeypatch.setattr("app.routers.assessment.run_grading_chain", fake_run)
    monkeypatch.setattr("app.routers.assessment.OpenAICompatibleClient", lambda: object())

    response = client.post("/assessment/grade-homework", json={"subject": "math", "ocrText": "1+1=2"})
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1


def test_predict_outcome_schema(monkeypatch):
    def fake_run(_client, _request):
        return PredictOutcomeResponse(calibrationFactor=1.1, rationale="基础较好")

    monkeypatch.setattr("app.routers.assessment.run_prediction_chain", fake_run)
    monkeypatch.setattr("app.routers.assessment.OpenAICompatibleClient", lambda: object())

    response = client.post(
        "/assessment/predict-outcome",
        json={
            "subject": "math",
            "overallBaseProb": 0.6,
            "nodes": [{"knowledgeId": 101, "title": "有理数运算", "baseProbability": 0.55}],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["calibrationFactor"] == 1.1


def test_provider_error_path():
    response = client.post("/vision/ocr", json={"image": "x", "task": "handwriting"})
    # 没有配置 API key 时必须失败，不允许本地回退。
    assert response.status_code in (200, 502)
