import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from "react";

export function PrismButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`prism-button ${props.className ?? ""}`.trim()} />;
}

export function PrismCard({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`prism-card ${className ?? ""}`.trim()} />;
}

export function PrismStatusBadge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest} className={`prism-badge ${className ?? ""}`.trim()} />;
}

export function PrismPanel({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <section className={`prism-panel ${className ?? ""}`.trim()}>{children}</section>;
}
