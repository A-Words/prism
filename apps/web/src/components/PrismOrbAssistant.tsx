import type { InterventionEvent, OrbVisualState } from "@prism/contracts";
import { PrismButton, PrismCard, PrismStatusBadge } from "./ui";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  event: InterventionEvent | null;
  onAccept: (eventId: string) => void;
  onReject: (eventId: string) => void;
};

export function PrismOrbAssistant({ event, onAccept, onReject }: Props) {
  const [opened, setOpened] = useState(false);
  const state: OrbVisualState = useMemo(() => {
    if (event) {
      return "intervene";
    }
    return opened ? "active" : "idle";
  }, [event, opened]);

  return (
    <div className="orb-container">
      <motion.button
        className={`orb orb-${state}`}
        onClick={() => setOpened((current) => !current)}
        animate={{ scale: state === "intervene" ? [1, 1.08, 1] : 1 }}
        transition={{ repeat: state === "intervene" ? Infinity : 0, duration: 1.2 }}
      >
        <Sparkles size={22} />
      </motion.button>
      {(opened || event) && (
        <PrismCard className="orb-panel" data-testid="orb-panel">
          <div className="orb-title">
            Prism Orb
            <PrismStatusBadge>{state}</PrismStatusBadge>
          </div>
          {event ? (
            <>
              <p className="orb-message">{event.message}</p>
              <div className="orb-actions">
                <PrismButton onClick={() => onAccept(event.event_id)}>接受建议</PrismButton>
                <PrismButton className="secondary" onClick={() => onReject(event.event_id)}>
                  稍后再说
                </PrismButton>
              </div>
            </>
          ) : (
            <p className="orb-message">随时提问，我可以帮你拆解、回顾或生成变式题。</p>
          )}
        </PrismCard>
      )}
    </div>
  );
}
