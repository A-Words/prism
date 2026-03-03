// app/(dashboard)/notes/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Note {
  id: number
  title: string
  content: string
  subject: string
  updatedAt: Date
}

const mockNotes: Note[] = [
  {
    id: 1,
    title: '一元二次方程解法',
    content: 'ax² + bx + c = 0 的解为 x = [-b ± √(b² - 4ac)] / 2a',
    subject: '数学',
    updatedAt: new Date()
  },
  {
    id: 2,
    title: '勾股定理',
    content: '直角三角形中，两直角边的平方和等于斜边的平方',
    subject: '数学',
    updatedAt: new Date(Date.now() - 86400000) // 昨天
  }
]

export default function NotesPage() {
  const [notes] = useState<Note[]>(mockNotes)
  const [selectedNote, setSelectedNote] = useState<Note | null>(mockNotes[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">📝 智能笔记助手</h1>
        <p className="text-muted-foreground mt-2">多模态输入，知识结构化，语义检索</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧：笔记列表 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>笔记列表</CardTitle>
              <CardDescription>共 {notes.length} 条笔记</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">+</span>
                新建笔记
              </Button>
              {notes.map((note) => (
                <Button
                  key={note.id}
                  variant={selectedNote?.id === note.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setSelectedNote(note)}
                >
                  <div className="w-full">
                    <div className="font-medium">{note.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {note.subject} · {note.updatedAt.toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：笔记内容 */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedNote ? selectedNote.title : '选择或创建笔记'}
              </CardTitle>
              <CardDescription>
                {selectedNote ? `最后更新：${selectedNote.updatedAt.toLocaleString()}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedNote ? (
                <div className="space-y-4">
                  <div className="min-h-[300px] p-4 border rounded-lg bg-muted/50">
                    {selectedNote.content}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">编辑</Button>
                    <Button variant="outline">导出</Button>
                    <Button variant="destructive">删除</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  请从左侧选择一条笔记，或创建新笔记
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}