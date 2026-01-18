import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Sidebar from '@/components/sidebar'
import { cn } from '@/lib/utils'

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
        <div
          className={cn(
            'flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100'
          )}
        >
          <Sidebar />
          <div className={cn('flex-1')}>
            <main className={cn('min-h-screen px-8 py-10')}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
