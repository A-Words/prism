"use client";

import { useEffect, useRef } from "react";
import katex from "katex";

interface MathRendererProps {
  math: string;
  display?: boolean;
  className?: string;
}

/**
 * KaTeX 数学公式渲染组件
 * 支持行内公式和块级公式
 */
export function MathRenderer({ math, display = false, className = "" }: MathRendererProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(math, ref.current, {
          displayMode: display,
          throwOnError: false,
          trust: true,
        });
      } catch {
        if (ref.current) {
          ref.current.textContent = math;
        }
      }
    }
  }, [math, display]);

  return <span ref={ref} className={className} />;
}

/**
 * 将包含 $...$ 和 $$...$$ 的文本渲染为数学公式
 */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return (
            <MathRenderer
              key={i}
              math={part.slice(2, -2)}
              display
            />
          );
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          return (
            <MathRenderer
              key={i}
              math={part.slice(1, -1)}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
