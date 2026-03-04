import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InterventionEvent, NoteSection, VisionStateJSON } from "@prism/contracts";
import { PrismButton } from "./components/ui";
import { PrismExplorePanel } from "./components/PrismExplorePanel";
import { PrismKnowledgeCanvas } from "./components/PrismKnowledgeCanvas";
import { PrismNotesPanel } from "./components/PrismNotesPanel";
import { PrismOrbAssistant } from "./components/PrismOrbAssistant";
import { PrismVisionGuard } from "./components/PrismVisionGuard";
import { analyzeVision, evaluateIntervention, exploreImage, exploreText, getNote, saveNote, syncPush } from "./lib/api";
import { supabase } from "./lib/supabase";
import { useFocusStore } from "./store/useFocusStore";
import { useSessionStore } from "./store/useSessionStore";
import { shouldTriggerIntervention } from "./hooks/useInterventionEngine";

const queryClient = new QueryClient();

function FocusSpace() {
  const token = useSessionStore((s) => s.accessToken) ?? undefined;
  const session = useSessionStore((s) => s);
  const {
    outline,
    selectedNodeId,
    notesByNode,
    visionState,
    consentEnabled,
    intervention,
    setOutline,
    setSelectedNode,
    setNote,
    setVision,
    setIntervention,
    toggleConsent,
  } = useFocusStore();

  const [submitting, setSubmitting] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [streamingBuffer, setStreamingBuffer] = useState("");
  const [syncing, setSyncing] = useState(false);
  const samplesRef = useRef<VisionStateJSON[]>([]);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      const current = data.session;
      if (!current) {
        return;
      }
      session.setSession({
        accessToken: current.access_token,
        refreshToken: current.refresh_token,
        expiresAt: current.expires_at ?? null,
        userId: current.user.id,
      });
    });
    const subscription = supabase.auth.onAuthStateChange((_event, current) => {
      if (!current) {
        session.clearSession();
        return;
      }
      session.setSession({
        accessToken: current.access_token,
        refreshToken: current.refresh_token,
        expiresAt: current.expires_at ?? null,
        userId: current.user.id,
      });
    });
    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  async function loadNodeNote(nodeId: string) {
    setNoteLoading(true);
    setStreamingBuffer("");
    try {
      const note = await getNote(nodeId, token);
      setNote(note);
    } catch {
      setStreamingBuffer("\n\n- 自动讲解：该节点暂无笔记，建议先理解定义，再做一道变式题。");
      setNote({
        node_id: nodeId,
        markdown: `## ${nodeId}\n\n等待 AI 流式补全...`,
        generated_by: "ai",
        updated_at: new Date().toISOString(),
      });
    } finally {
      setNoteLoading(false);
    }
  }

  useEffect(() => {
    if (selectedNodeId) {
      void loadNodeNote(selectedNodeId);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    if (!consentEnabled) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      return;
    }

    void navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 180 }, audio: false })
      .then((stream) => {
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          void cameraVideoRef.current.play();
        }
      })
      .catch(() => {
        toggleConsent(false);
      });

    const timer = setInterval(async () => {
      try {
        let frameDataURL = "";
        const video = cameraVideoRef.current;
        const canvas = cameraCanvasRef.current;
        if (video && canvas && video.readyState >= 2) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 320;
            canvas.height = 180;
            ctx.drawImage(video, 0, 0, 320, 180);
            frameDataURL = canvas.toDataURL("image/jpeg", 0.5);
          }
        }
        const vision = await analyzeVision(true, token, frameDataURL);
        setVision(vision);
        samplesRef.current = [...samplesRef.current.slice(-3), vision];
        if (shouldTriggerIntervention(samplesRef.current)) {
          const event = await evaluateIntervention(vision, token);
          if (event) {
            setIntervention(event);
          }
        }
      } catch {
        // degrade silently
      }
    }, 15000);

    return () => {
      clearInterval(timer);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [consentEnabled, token]);

  async function onSubmitText(topic: string) {
    setSubmitting(true);
    try {
      const result = await exploreText(topic, token);
      setOutline(result);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitImage(file: File) {
    setSubmitting(true);
    try {
      const result = await exploreImage(file, token);
      setOutline(result);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveNote(markdown: string) {
    if (!selectedNodeId) {
      return;
    }
    const updated = await saveNote(selectedNodeId, markdown, token);
    setNote(updated);
  }

  async function onLogin() {
    if (!supabase) {
      return;
    }
    const redirectTo = `${window.location.origin}/`;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
  }

  async function onLogout() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    session.clearSession();
  }

  async function onSyncPush() {
    setSyncing(true);
    try {
      await syncPush(token);
    } finally {
      setSyncing(false);
    }
  }

  const selectedNote: NoteSection | null = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }
    return notesByNode[selectedNodeId] ?? null;
  }, [notesByNode, selectedNodeId]);

  return (
    <div className="focus-layout">
      <header className="topbar">
        <div className="brand">Prism Focus Space</div>
        <div className="topbar-actions">
          <PrismButton className="secondary" onClick={() => void onSyncPush()} disabled={syncing}>
            {syncing ? "同步中..." : "同步"}
          </PrismButton>
          {session.isAuthenticated ? (
            <PrismButton className="secondary" onClick={() => void onLogout()}>
              退出登录
            </PrismButton>
          ) : (
            <PrismButton className="secondary" onClick={() => void onLogin()}>
              Supabase 登录
            </PrismButton>
          )}
          <PrismVisionGuard consentEnabled={consentEnabled} vision={visionState} onToggleConsent={toggleConsent} />
        </div>
      </header>

      <main className="main-grid">
        <section className="left-pane">
          <PrismExplorePanel submitting={submitting} onSubmitText={onSubmitText} onSubmitImage={onSubmitImage} />
          <PrismKnowledgeCanvas
            outline={outline}
            selectedNodeId={selectedNodeId}
            onNodeSelect={(id) => setSelectedNode(id)}
          />
        </section>

        <section className="right-pane">
          <PrismNotesPanel
            nodeId={selectedNodeId}
            note={selectedNote}
            loading={noteLoading}
            streamingBuffer={streamingBuffer}
            onSave={onSaveNote}
          />
        </section>
      </main>

      <PrismOrbAssistant
        event={intervention as InterventionEvent | null}
        onAccept={(id) =>
          setIntervention(
            intervention && intervention.event_id === id ? { ...intervention, accepted: true } : intervention,
          )
        }
        onReject={(id) =>
          setIntervention(
            intervention && intervention.event_id === id ? { ...intervention, accepted: false } : null,
          )
        }
      />
      <video ref={cameraVideoRef} style={{ display: "none" }} playsInline muted />
      <canvas ref={cameraCanvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FocusSpace />
    </QueryClientProvider>
  );
}
