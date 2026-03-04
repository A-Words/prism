import { create } from "zustand";
import type { AuthSessionState } from "@prism/contracts";

type SessionStore = AuthSessionState & {
  setSession: (session: Partial<AuthSessionState>) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  userId: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isAuthenticated: false,
  setSession: (session) =>
    set((state) => ({
      ...state,
      ...session,
      isAuthenticated: Boolean(session.accessToken ?? state.accessToken),
    })),
  clearSession: () =>
    set({
      userId: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
    }),
}));
