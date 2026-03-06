import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 将掌握度分数转为等级
 */
export function scoreToMastery(score: number): "none" | "low" | "medium" | "high" | "full" {
  if (score <= 0) return "none";
  if (score < 0.3) return "low";
  if (score < 0.6) return "medium";
  if (score < 0.85) return "high";
  return "full";
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * 生成简单 ID
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
