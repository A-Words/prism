from __future__ import annotations

from pydantic import BaseModel

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import PredictOutcomeRequest, PredictOutcomeResponse


class PredictResult(BaseModel):
    calibrationFactor: float
    rationale: str


def run_prediction_chain(client: OpenAICompatibleClient, request: PredictOutcomeRequest) -> PredictOutcomeResponse:
    system_prompt = (
        "你是学习效果预测校准器。"
        "你只输出 JSON，并将 calibrationFactor 控制在 0.8 到 1.2 之间。"
        "rationale 用中文简要说明影响因素。"
    )
    user_prompt = (
        f"subject={request.subject}\n"
        f"overall_base_probability={request.overall_base_prob}\n"
        f"nodes={request.nodes}\n"
        "请根据学习路径难度、当前基线概率和知识点分布给出校准因子。"
    )

    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=PredictResult,
    )
    parsed = PredictResult.model_validate(result)
    calibration = max(0.8, min(1.2, parsed.calibrationFactor))
    return PredictOutcomeResponse.model_validate(
        {"calibrationFactor": calibration, "rationale": parsed.rationale}
    )
