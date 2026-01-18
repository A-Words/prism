export default function Home() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-slate-500">欢迎回来</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Prism 学习中枢概览
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          在这里集中查看学习路径、测评进度与情绪专注状态，并快速进入核心功能。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: '学习路径', value: '3 条', desc: '正在进行' },
          { title: '待完成测评', value: '5 项', desc: '本周计划' },
          { title: '专注度', value: '82%', desc: '过去 7 天均值' },
          { title: '情绪状态', value: '稳定', desc: '今天' },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {item.title}
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {item.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">今日学习节奏</h2>
          <p className="mt-2 text-sm text-slate-600">
            你的学习节奏稳定，建议保持当前计划并关注午后疲劳提醒。
          </p>
          <div className="mt-6 h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">快捷入口</h2>
          <div className="mt-4 space-y-3">
            {['开启虚拟导师', '继续学习路径', '记录课堂笔记'].map((item) => (
              <button
                key={item}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
