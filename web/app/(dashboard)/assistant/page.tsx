"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Send, Plus, MessageSquare, Loader2, Bot, User, Wifi, WifiOff } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import {
  createChatSession,
  listChatSessions,
  listChatMessages,
  getCurrentScene,
  switchScene,
} from "@/lib/api/client"
import { ChatSessionDTO, ChatMessageDTO, SceneType } from "@/lib/types/modules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAssistantWs } from "@/hooks/use-assistant-ws"

export default function AssistantPage() {
  // State
  const [sessions, setSessions] = useState<ChatSessionDTO[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessageDTO[]>([])
  const [inputValue, setInputValue] = useState("")
  const [scene, setScene] = useState<SceneType>("self-study")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState<string | null>(null)

  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auth helper
  const withToken = useCallback(async function runWithToken<T>(runner: (token: string) => Promise<T>) {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const t = data.session?.access_token
    if (!t) throw new Error("未获取到登录凭证，请重新登录")
    return runner(t)
  }, [])

  // Load token
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token || null)
    })
  }, [])

  const handleMessageComplete = useCallback((message: ChatMessageDTO) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const { isConnected, sendMessage, isStreaming, streamingContent } = useAssistantWs({
    token: token || undefined,
    onMessageComplete: handleMessageComplete,
    onError: (message) => setError(message),
  })

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await withToken((token) => listChatSessions(token))
      setSessions(data)
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id)
      }
    } catch {
      setError("加载会话列表失败")
    } finally {
      setLoading(false)
    }
  }, [withToken, currentSessionId])

  const loadMessages = useCallback(async (sessionId: number) => {
    try {
      const data = await withToken((token) => listChatMessages(token, sessionId))
      setMessages(data)
    } catch {
      setError("加载消息记录失败")
    }
  }, [withToken])

  const loadScene = useCallback(async () => {
    try {
      const data = await withToken((token) => getCurrentScene(token))
      setScene(data.currentScene)
    } catch {
      setError("加载场景失败")
    }
  }, [withToken])

  // Load sessions and scene on mount
  useEffect(() => {
    loadSessions()
    loadScene()
  }, [loadSessions, loadScene])

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    } else {
      setMessages([])
    }
  }, [currentSessionId, loadMessages])

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, streamingContent, isStreaming])

  const handleSceneChange = useCallback(async (value: SceneType) => {
    setScene(value)
    try {
      const data = await withToken((token) => switchScene(token, value))
      setScene(data.currentScene)
    } catch {
      setError("切换场景失败")
    }
  }, [withToken])

  const handleCreateSession = async () => {
    try {
      setLoading(true)
      const title = `新的辅导会话 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      const newSession = await withToken((token) => createChatSession(token, title))
      setSessions((prev) => [newSession, ...prev])
      setCurrentSessionId(newSession.id)
    } catch {
      setError("创建会话失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentSessionId || !isConnected) return

    const content = inputValue
    setInputValue("")

    // Optimistic update for user message
    const tempMessage: ChatMessageDTO = {
      id: Date.now(), // Temp ID
      sessionId: currentSessionId,
      role: "user",
      content: content,
      relatedKnowledgeIds: [],
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMessage])

    try {
      sendMessage(currentSessionId, content, scene)
    } catch {
      setError("发送消息失败")
      // Remove optimistic message on error? 
      // Actually sendMessage is void, errors are handled via WS events or try/catch if send fails immediately
    }
  }

  useEffect(() => {
    const refreshScene = () => {
      void loadScene()
    }
    window.addEventListener("focus", refreshScene)
    return () => {
      window.removeEventListener("focus", refreshScene)
    }
  }, [loadScene])

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* Sidebar - Session List */}
      <Card className="w-64 flex-shrink-0 flex flex-col">
        <CardHeader className="p-4 border-b">
          <Button onClick={handleCreateSession} className="w-full gap-2" variant="default">
            <Plus className="h-4 w-4" />
            新建会话
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading && sessions.length === 0 ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground p-4">暂无历史会话</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  currentSessionId === session.id
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{session.title}</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              虚拟助教
            </CardTitle>
            {currentSessionId && <Badge variant="outline">会话 #{currentSessionId}</Badge>}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground" title={isConnected ? "已连接" : "未连接"}>
              {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前场景:</span>
              <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={scene}
                onChange={(e) => void handleSceneChange(e.target.value as SceneType)}
              >
                <option value="classroom">课堂同步</option>
                <option value="self-study">自主学习</option>
                <option value="exam-prep">考前复习</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!currentSessionId ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Bot className="h-12 w-12 mb-2 opacity-20" />
                <p>选择或创建一个会话开始提问</p>
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                还没有消息，试着问个问题吧...
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => {
                  const isUser = msg.role === "user"
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                      {isUser && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* Streaming Message Bubble */}
                {isStreaming && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-muted text-muted-foreground">
                      {streamingContent}
                      <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary animate-pulse" />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder={isConnected ? "输入你的问题..." : "连接中..."}
                disabled={!currentSessionId || isStreaming || !isConnected}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!currentSessionId || isStreaming || !inputValue.trim() || !isConnected}>
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">发送</span>
              </Button>
            </div>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
