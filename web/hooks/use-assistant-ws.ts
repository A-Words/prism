"use client"

import { useState, useCallback } from "react"
import { useWebSocket, WSEnvelope } from "./use-websocket"
import { ChatMessageDTO, SceneType } from "@/lib/types/modules"

interface UseAssistantWsOptions {
  token?: string
  onMessageComplete?: (message: ChatMessageDTO) => void
}

export function useAssistantWs({ token, onMessageComplete }: UseAssistantWsOptions) {
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastCompletedMessage, setLastCompletedMessage] = useState<ChatMessageDTO | null>(null)
  const [isConnected, setIsConnected] = useState(false)

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
        console.error("Assistant WS Error:", envelope.payload)
        setIsStreaming(false)
        break
      default:
        break
    }
  }, [onMessageComplete])

  const handleOpen = useCallback(() => setIsConnected(true), [])
  const handleClose = useCallback(() => setIsConnected(false), [])
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
    send(envelope)
  }, [send])

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
