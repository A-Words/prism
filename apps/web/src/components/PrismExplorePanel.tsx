import { PrismButton, PrismCard } from "./ui";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  submitting: boolean;
  onSubmitText: (topic: string) => Promise<void>;
  onSubmitImage: (file: File) => Promise<void>;
};

export function PrismExplorePanel({ submitting, onSubmitText, onSubmitImage }: Props) {
  const [topic, setTopic] = useState("二次函数与抛物线");
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <PrismCard className="explore-panel">
      <div className="explore-header">万物探索栏</div>
      <textarea
        className="explore-textarea"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="输入你想探索的知识主题"
      />
      <div className="explore-actions">
        <PrismButton disabled={submitting || !topic.trim()} onClick={() => onSubmitText(topic)}>
          {submitting ? "生成中..." : "文本探索"}
        </PrismButton>
        <PrismButton
          type="button"
          disabled={submitting}
          onClick={() => fileInput.current?.click()}
          className="secondary"
        >
          <Upload size={16} /> 上传题图
        </PrismButton>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onSubmitImage(file);
            }
          }}
        />
      </div>
    </PrismCard>
  );
}
