"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { createNote, listNotes, ocrNote, searchNotes, transcribeAudio } from "@/lib/api/client"
import { NoteDTO, NoteSourceType, SearchResultItem } from "@/lib/types/modules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { NotebookPen, Search, Mic, Plus } from "lucide-react"

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteDTO[]>([])
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [sourceType, setSourceType] = useState<NoteSourceType>("manual")
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocring, setOcring] = useState(false)
  const [ocrHint, setOcrHint] = useState("")
  const [error, setError] = useState("")

  const withToken = useCallback(async function runWithToken<T>(runner: (token: string) => Promise<T>) {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("未获取到登录凭证，请重新登录")
    return runner(token)
  }, [])

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await withToken((token) => listNotes(token))
      setNotes(data)
    } catch (err) {
      setError("加载笔记失败")
    } finally {
      setLoading(false)
    }
  }, [withToken])

  useEffect(() => { loadNotes() }, [loadNotes])

  const handleCreate = async () => {
    if (!title || !content) return
    try {
      setLoading(true)
      await withToken((token) => createNote(token, { title, content, sourceType }))
      setTitle("")
      setContent("")
      setSourceType("manual")
      loadNotes()
    } catch (err) {
      setError("创建笔记失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults([])
      return
    }
    try {
      setLoading(true)
      const res = await withToken((token) => searchNotes(token, searchQuery))
      setSearchResults(res.results)
    } catch (err) {
      setError("搜索失败")
    } finally {
      setLoading(false)
    }
  }

  const handleTranscribe = async () => {
    try {
      setTranscribing(true)
      // 模拟音频数据 (base64 placeholder)
      const mockAudio = "UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA=="
      const res = await withToken((token) => transcribeAudio(token, mockAudio, "wav"))
      setContent((prev) => prev + (prev ? "\n" : "") + res.text)
    } catch (err) {
      setError("语音转写失败")
    } finally {
      setTranscribing(false)
    }
  }

  const handleOCRUpload = async () => {
    if (!ocrFile) return
    try {
      setOcring(true)
      const formData = new FormData()
      formData.set("file", ocrFile)
      if (title.trim()) {
        formData.set("title", title.trim())
      }
      formData.set("task", "handwriting")
      const res = await withToken((token) => ocrNote(token, formData))
      setTitle(res.note.title)
      setContent(res.note.content)
      setSourceType("ocr")
      setOcrHint(`已关联知识点 ${res.relatedKnowledgeIds.length} 个`)
      await loadNotes()
    } catch (_err) {
      setError("OCR 入库失败")
    } finally {
      setOcring(false)
    }
  }

  const getBadgeColor = (type: NoteSourceType) => {
    switch (type) {
      case "voice": return "bg-blue-500"
      case "ocr": return "bg-green-500"
      case "auto-generated": return "bg-purple-500"
      default: return "bg-slate-500"
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <NotebookPen className="h-8 w-8" /> 智能笔记
        </h1>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input placeholder="搜索笔记内容..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Button size="icon" onClick={handleSearch} disabled={loading}><Search className="h-4 w-4" /></Button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {searchResults.length > 0 && (
        <Card className="bg-slate-50 border-blue-200">
          <CardHeader><CardTitle className="text-lg">搜索结果</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {searchResults.map((res) => (
              <div key={res.id} className="p-3 bg-white rounded border">
                <div className="font-bold text-sm">{res.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{res.content}</div>
                <div className="text-xs text-blue-600 mt-1">相关度: {(res.score * 100).toFixed(1)}%</div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSearchResults([])} className="w-full text-xs">清除结果</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>新建笔记</CardTitle>
            <CardDescription>记录新的学习心得</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="relative">
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <Button size="icon" variant="ghost" className="absolute bottom-2 right-2 h-6 w-6" onClick={handleTranscribe} disabled={transcribing}>
                <Mic className={`h-4 w-4 ${transcribing ? "text-red-500 animate-pulse" : ""}`} />
              </Button>
            </div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as NoteSourceType)}
            >
              <option value="manual">手动输入</option>
              <option value="voice">语音录入</option>
              <option value="ocr">OCR 识别</option>
            </select>
            <div className="space-y-2">
              <Input type="file" accept="image/*" onChange={(e) => setOcrFile(e.target.files?.[0] ?? null)} />
              <Button variant="outline" className="w-full" onClick={handleOCRUpload} disabled={ocring || !ocrFile}>
                {ocring ? "OCR 处理中..." : "上传图片并 OCR 入库"}
              </Button>
              {ocrHint ? <p className="text-xs text-muted-foreground">{ocrHint}</p> : null}
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={loading || !title || !content}>
              <Plus className="mr-2 h-4 w-4" /> {loading ? "保存中..." : "保存笔记"}
            </Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 content-start">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base font-medium leading-tight">{note.title}</CardTitle>
                  <Badge className={`${getBadgeColor(note.sourceType)} text-[10px] px-1 py-0 h-5 whitespace-nowrap`}>
                    {note.sourceType === "manual" ? "手动" : note.sourceType === "voice" ? "语音" : note.sourceType === "ocr" ? "OCR" : "自动"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {new Date(note.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && !loading && (
            <div className="col-span-full text-center text-muted-foreground py-10">暂无笔记</div>
          )}
        </div>
      </div>
    </div>
  )
}
