import { cn } from "@/lib/utils"

export default function Loading() {
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center")}> 
      <div
        className={cn(
          "w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        )}
      >
        <div className={cn("space-y-4")}> 
          <div className={cn("h-4 w-24 rounded-full bg-slate-200 dark:bg-slate-700")} />
          <div className={cn("h-7 w-48 rounded-full bg-slate-200 dark:bg-slate-700")} />
          <div className={cn("h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700")} />
          <div className={cn("h-4 w-5/6 rounded-full bg-slate-200 dark:bg-slate-700")} />
          <div className={cn("mt-6 grid gap-3 sm:grid-cols-2")}> 
            <div className={cn("h-24 rounded-xl bg-slate-100 dark:bg-slate-800")} />
            <div className={cn("h-24 rounded-xl bg-slate-100 dark:bg-slate-800")} />
          </div>
        </div>
      </div>
    </div>
  )
}
