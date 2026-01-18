import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'Prism - AI 个性化学习系统',
  description: '实时情绪响应的智能学习平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
          <Sidebar />
          <div className="flex-1">
            <main className="min-h-screen px-8 py-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
