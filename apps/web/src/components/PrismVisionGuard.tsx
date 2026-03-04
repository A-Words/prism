import type { VisionStateJSON } from "@prism/contracts";
import { PrismCard, PrismStatusBadge } from "./ui";

type Props = {
  consentEnabled: boolean;
  vision: VisionStateJSON | null;
  onToggleConsent: (enabled: boolean) => void;
};

export function PrismVisionGuard({ consentEnabled, vision, onToggleConsent }: Props) {
  return (
    <PrismCard className="vision-guard">
      <div className="vision-top">
        <div>
          <div className="vision-title">AI Vision Active</div>
          <div className="vision-subtitle">仅采集标签，不保存图像</div>
        </div>
        <label className="vision-switch">
          <input
            type="checkbox"
            checked={consentEnabled}
            onChange={(event) => onToggleConsent(event.target.checked)}
          />
          <span>{consentEnabled ? "已授权" : "未授权"}</span>
        </label>
      </div>
      <div className="vision-state">
        <PrismStatusBadge>{vision?.focus_level ?? "unknown"}</PrismStatusBadge>
        <PrismStatusBadge>{vision?.emotion ?? "unknown"}</PrismStatusBadge>
        <PrismStatusBadge>{vision?.posture ?? "unknown"}</PrismStatusBadge>
      </div>
    </PrismCard>
  );
}
