"use client"

import { useState, useCallback, useEffect } from "react"
import { useWebSocket, WSEnvelope } from "./use-websocket"
import { EmotionType, HealthAlertDTO } from "@/lib/types/modules"

interface EmotionResult {
  emotion: EmotionType
  confidence: number
  focusScore?: number
  fatigueLevel?: number
}

interface PoseResult {
  status: "good" | "slouching" | "too_close"
  confidence: number
}

interface UseMonitorWsOptions {
  token?: string
  onHealthAlert?: (alert: HealthAlertDTO) => void
}

export function useMonitorWs({ token, onHealthAlert }: UseMonitorWsOptions) {
  const [emotionResult, setEmotionResult] = useState<EmotionResult | null>(null)
  const [poseResult, setPoseResult] = useState<PoseResult | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const handleMessage = useCallback((envelope: WSEnvelope) => {
    switch (envelope.event) {
      case "emotion_result":
        setEmotionResult(envelope.payload as EmotionResult)
        break
      case "pose_result":
        setPoseResult(envelope.payload as PoseResult)
        break
      case "health_alert":
        if (onHealthAlert) {
          onHealthAlert(envelope.payload as HealthAlertDTO)
        }
        break
      default:
        // console.log("Unknown monitor event:", envelope.event)
        break
    }
  }, [onHealthAlert])

  const handleOpen = useCallback(() => setIsConnected(true), [])
  const handleClose = useCallback(() => setIsConnected(false), [])
  const { send, connect, disconnect, readyState } = useWebSocket({
    url: "/ws/monitor",
    token,
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    autoConnect: false, // Manual control
  })

  const sendVideoFrame = useCallback((image: string, audio?: string, scene?: string) => {
    const envelope: WSEnvelope = {
      event: "video_frame",
      timestamp: new Date().toISOString(),
      traceId: crypto.randomUUID(),
      payload: {
        image,
        audio,
        scene
      }
    }
    send(envelope)
  }, [send])

  return {
    isConnected: readyState === WebSocket.OPEN,
    connect,
    disconnect,
    sendVideoFrame,
    emotionResult,
    poseResult,
  }
}
