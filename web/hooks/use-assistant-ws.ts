"use client"

import { useState, useCallback } from "react"
import { useWebSocket, WSEnvelope } from "./use-websocket"
import { ChatMessageDTO, SceneType } from "@/lib/types/modules"

interface UseAssistantWsOptions {
  token?: string
  onMessageComplete?: (message: ChatMessageDTO) => void
  onError?: (message: string) => void
}

export function useAssistantWs({ token, onMessageComplete, onError }: UseAssistantWsOptions) {
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastCompletedMessage, setLastCompletedMessage] = useState<ChatMessageDTO | null>(null)

  const handleMessage = useCallback((envelope: WSEnvelope) => {
    switch (envelope.event) {
      case "chat_chunk":
        setIsStreaming(true)
        // 服务端 chat_chunk payload 格式: {index: number, content: string}
        const chunk = envelope.payload as { index: number; content: string }
        setStreamingContent(prev => prev + chunk.content)
        break
      case "chat_done":
        setIsStreaming(false)
        // 服务端 chat_done payload 格式: {messageId, content, relatedKnowledgeIds, createdAt}
        const donePayload = envelope.payload as { messageId: number; content: string; relatedKnowledgeIds: number[]; createdAt: string }
        const finalMessage: ChatMessageDTO = {
          id: donePayload.messageId,
          sessionId: 0, // 由调用方根据上下文补充
          role: "assistant",
          content: donePayload.content,
          relatedKnowledgeIds: donePayload.relatedKnowledgeIds || [],
          createdAt: donePayload.createdAt,
        }
        setLastCompletedMessage(finalMessage)
        if (onMessageComplete) {
          onMessageComplete(finalMessage)
        }
        break
      case "error":
        const errorText =
          (envelope.payload as { message?: string })?.message ||
          "助教暂时不可用，请稍后重试。"
        console.error("Assistant WS Error:", envelope.payload)
        setIsStreaming(false)
        onError?.(errorText)
        break
      default:
        break
    }
  }, [onMessageComplete, onError])

  const { send, connect, disconnect, readyState } = useWebSocket({
    url: "/ws/assistant",
    token,
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    autoConnect: true,
  })

  const sendMessage = useCallback((sessionId: number, content: string, scene?: SceneType) => {
    // Reset streaming state for new message
    setStreamingContent("")
    setIsStreaming(true)
    
    const envelope: WSEnvelope = {
      event: "chat_message",
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID(),
      sessionId: sessionId.toString(),
      payload: {
        sessionId,
        content,
        scene
      }
    }
    const sent = send(envelope)
    if (!sent) {
      setIsStreaming(false)
      onError?.("连接已断开，消息发送失败，请重试。")
    }
  }, [send, onError])

  return {
    isConnected: readyState === WebSocket.OPEN,
    isStreaming,
    streamingContent,
    sendMessage,
    lastCompletedMessage,
    connect,
    disconnect
  }
}
