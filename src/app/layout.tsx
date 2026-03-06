import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Sidebar } from "@/components/nav/sidebar";

export const metadata: Metadata = {
  title: {
    default: "Prism - 数学学习导航",
    template: "%s | Prism",
  },
  description: "AI 驱动的高中数学学习导航系统 —— 解题路径图、学习路径图、个性化诊断回溯",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <Sidebar />
        <main className="ml-[240px] min-h-screen transition-all duration-300">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
