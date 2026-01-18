"use client"

import { cn } from "@/lib/utils"

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="zh-CN">
      <body className={cn("bg-background text-foreground")}> 
        <div className={cn("flex min-h-screen items-center justify-center px-6")}> 
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
            )}
          >
            <p className={cn("text-sm font-medium text-slate-500 dark:text-slate-400")}>
              系统异常
            </p>
            <h1
              className={cn(
                "mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100"
              )}
            >
              应用遇到严重错误
            </h1>
            <p className={cn("mt-3 text-sm text-slate-600 dark:text-slate-300")}>
              请尝试刷新页面，或稍后再试。
            </p>
            {error?.digest ? (
              <p className={cn("mt-2 text-xs text-slate-400")}>
                错误编号：{error.digest}
              </p>
            ) : null}
            <div className={cn("mt-6 flex justify-center")}> 
              <button
                type="button"
                onClick={reset}
                className={cn(
                  "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                )}
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
