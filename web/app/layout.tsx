import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import AppLayout from '@/components/layouts/app-layout'

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Script id="theme-sync" strategy="beforeInteractive">
          {`(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const applyTheme = () => {
    document.documentElement.classList.toggle('dark', media.matches)
  }
  applyTheme()
  if (media.addEventListener) {
    media.addEventListener('change', applyTheme)
  } else {
    media.addListener(applyTheme)
  }
})()`}
        </Script>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
