import type { NoteSection } from "@prism/contracts";
import { PrismButton, PrismCard } from "./ui";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Props = {
  nodeId: string | null;
  note: NoteSection | null;
  loading: boolean;
  streamingBuffer: string;
  onSave: (markdown: string) => Promise<void>;
};

export function PrismNotesPanel({ nodeId, note, loading, streamingBuffer, onSave }: Props) {
  const base = useMemo(() => note?.markdown ?? "", [note]);
  const [draft, setDraft] = useState(base);

  useEffect(() => {
    setDraft(base);
  }, [base, nodeId]);

  const composed = `${draft}${streamingBuffer}`;

  return (
    <PrismCard className="notes-panel" data-testid="notes-panel">
      <div className="notes-title">智能笔记板</div>
      {!nodeId ? <div className="notes-empty">请先选择知识节点。</div> : null}
      {loading ? <div className="notes-loading">内容生成中...</div> : null}
      <textarea
        className="notes-editor"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="在这里编辑你的笔记，支持 Markdown 和 LaTeX"
      />
      <div className="notes-actions">
        <PrismButton disabled={!nodeId} onClick={() => void onSave(draft)}>
          保存笔记
        </PrismButton>
      </div>
      <div className="notes-preview" data-testid="notes-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {composed || "_暂无内容_"}
        </ReactMarkdown>
      </div>
    </PrismCard>
  );
}
