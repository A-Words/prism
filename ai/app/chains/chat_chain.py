from __future__ import annotations

from pydantic import BaseModel, Field

from app.providers.openrouter_client import OpenAICompatibleClient
from app.schemas import ChatCompletionRequest, ChatCompletionResponse


class ChatResult(BaseModel):
    content: str
    relatedKnowledgeIds: list[int] = Field(default_factory=list)


def run_chat_chain(
    client: OpenAICompatibleClient, request: ChatCompletionRequest
) -> ChatCompletionResponse:
    """基于对话历史与知识上下文生成助教回复。"""
    # 构建系统 prompt，根据场景定制人设
    scene_hints = {
        "classroom": "当前为课堂场景，回答应简洁并关联课堂内容。",
        "self-study": "当前为自习场景，可详细展开并给出额外练习建议。",
        "exam-prep": "当前为考前复习场景，回答应聚焦高频考点和解题技巧。",
    }
    scene_hint = scene_hints.get(request.scene or "", "")

    system_prompt = (
        "你是 Prism 智能虚拟助教，一位有耐心且善解人意的高中数理辅导老师。"
        "回答应准确、有条理，适当使用公式和举例。"
        "如果涉及知识点 ID，请在 relatedKnowledgeIds 中列出。"
        f"{scene_hint}"
    )

    if request.knowledge_context:
        system_prompt += f"\n\n相关知识上下文：\n{request.knowledge_context[:4000]}"

    # 将历史消息拼接为 user prompt（排除 system 消息）
    conversation = ""
    for msg in request.messages:
        if msg.role != "system":
            conversation += f"[{msg.role}]: {msg.content}\n"

    user_prompt = (
        conversation.strip()
        + "\n请以助教身份回复最后一条用户消息，输出 JSON 包含 content 和 relatedKnowledgeIds。"
    )

    result = client.generate_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_model=ChatResult,
    )
    parsed = ChatResult.model_validate(result)
    return ChatCompletionResponse.model_validate(
        {
            "content": parsed.content,
            "relatedKnowledgeIds": parsed.relatedKnowledgeIds,
        }
    )
