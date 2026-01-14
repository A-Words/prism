import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
