"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface WSEnvelope {
  event: string
  timestamp: string
  traceId: string
  sessionId?: string
  payload: unknown
}

interface UseWebSocketOptions {
  url: string
  token?: string
  onMessage?: (envelope: WSEnvelope) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (event: Event) => void
  autoConnect?: boolean
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onOpen,
  onClose,
  onError,
  autoConnect = true,
}: UseWebSocketOptions) {
  const [readyState, setReadyState] = useState<number>(typeof WebSocket !== "undefined" ? WebSocket.CLOSED : 3)
  const [lastMessage, setLastMessage] = useState<WSEnvelope | null>(null)
  
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const connectRef = useRef<() => void>(() => {})
  
  // Base URL calculation
  const getWsUrl = useCallback(() => {
    if (!token) return null
    
    // Determine base URL from env or default
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"
    
    // Strip /api/v1 suffix if present
    const cleanBase = apiBase.replace(/\/api\/v1\/?$/, "")
    
    // Convert protocol
    const isHttps = cleanBase.startsWith("https") || (typeof window !== "undefined" && window.location.protocol === "https:")
    const wsProtocol = isHttps ? "wss:" : "ws:"
    
    // Extract host
    let wsHost = ""
    if (cleanBase.startsWith("http")) {
      try {
        const urlObj = new URL(cleanBase)
        wsHost = urlObj.host
      } catch (e) {
        wsHost = "localhost:8080"
      }
    } else if (typeof window !== "undefined") {
      wsHost = window.location.host
    } else {
      wsHost = "localhost:8080"
    }
    
    // Construct full URL with path
    // The url prop should start with / (e.g. /ws/monitor)
    return `${wsProtocol}//${wsHost}${url}?token=${token}`
  }, [url, token])

  const connect = useCallback(() => {
    // Prevent multiple connections or if no token
    if (!token) return
    
    // If already connected or connecting, don't do anything
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    const fullUrl = getWsUrl()
    if (!fullUrl) return

    try {
      const ws = new WebSocket(fullUrl)
      socketRef.current = ws
      setReadyState(WebSocket.CONNECTING)

      ws.onopen = () => {
        setReadyState(WebSocket.OPEN)
        reconnectAttemptsRef.current = 0
        onOpen?.()
      }

      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED)
        socketRef.current = null
        onClose?.()

        // Auto-reconnect logic
        if (autoConnect && reconnectAttemptsRef.current < 3) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          reconnectAttemptsRef.current += 1
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current()
          }, timeout)
        }
      }

      ws.onerror = (event) => {
        onError?.(event)
      }

      ws.onmessage = (event) => {
        try {
          const envelope: WSEnvelope = JSON.parse(event.data)
          setLastMessage(envelope)
          onMessage?.(envelope)
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e)
        }
      }
    } catch (e) {
      console.error("WebSocket connection error:", e)
    }
  }, [getWsUrl, onMessage, onOpen, onClose, onError, autoConnect, token])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    setReadyState(WebSocket.CLOSED)
  }, [])

  const send = useCallback((data: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  // Initial connection effect
  useEffect(() => {
    let connectTimer: NodeJS.Timeout | undefined
    if (autoConnect && token) {
      // 避免在 effect 同步阶段直接触发状态更新
      connectTimer = setTimeout(() => {
        connect()
      }, 0)
    }
    
    return () => {
      if (connectTimer) {
        clearTimeout(connectTimer)
      }
      disconnect()
    }
  }, [connect, disconnect, autoConnect, token])

  return {
    send,
    lastMessage,
    readyState,
    connect,
    disconnect,
  }
}
