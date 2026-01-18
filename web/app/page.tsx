import { cn } from '@/lib/utils'

export default function Home() {
  return (
    <div className={cn('space-y-6')}>
      <header className={cn('space-y-2')}>
        <p className={cn('text-sm font-medium text-slate-500 dark:text-slate-400')}>
          欢迎回来
        </p>
        <h1 className={cn('text-3xl font-semibold text-slate-900 dark:text-slate-100')}>
          Prism 学习中枢概览
        </h1>
        <p className={cn('max-w-2xl text-sm text-slate-600 dark:text-slate-300')}>
          在这里集中查看学习路径、测评进度与情绪专注状态，并快速进入核心功能。
        </p>
      </header>

      <section className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4')}>
        {[
          { title: '学习路径', value: '3 条', desc: '正在进行' },
          { title: '待完成测评', value: '5 项', desc: '本周计划' },
          { title: '专注度', value: '82%', desc: '过去 7 天均值' },
          { title: '情绪状态', value: '稳定', desc: '今天' },
        ].map((item) => (
          <div
            key={item.title}
            className={cn(
              'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'
            )}
          >
            <p
              className={cn(
                'text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500'
              )}
            >
              {item.title}
            </p>
            <p className={cn('mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100')}>
              {item.value}
            </p>
            <p className={cn('mt-1 text-sm text-slate-500 dark:text-slate-400')}>
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      <section className={cn('grid gap-4 lg:grid-cols-[2fr,1fr]')}>
        <div
          className={cn(
            'rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900'
          )}
        >
          <h2 className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100')}>
            今日学习节奏
          </h2>
          <p className={cn('mt-2 text-sm text-slate-600 dark:text-slate-300')}>
            你的学习节奏稳定，建议保持当前计划并关注午后疲劳提醒。
          </p>
          <div
            className={cn(
              'mt-6 h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'
            )}
          />
        </div>
        <div
          className={cn(
            'rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900'
          )}
        >
          <h2 className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100')}>
            快捷入口
          </h2>
          <div className={cn('mt-4 space-y-3')}>
            {['开启虚拟导师', '继续学习路径', '记录课堂笔记'].map((item) => (
              <button
                key={item}
                className={cn(
                  'w-full rounded-lg border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
