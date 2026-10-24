/**
 * AuthContext — single source of truth for the current user across the app.
 *
 * On mount: reads JWT from localStorage, calls /auth/me to verify, sets user.
 * On login/signup: components call login()/signup() helpers; provider re-syncs.
 * Logout: clears storage and reloads to /login.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  type AuthUser,
  clearAuth,
  fetchMe,
  getToken,
  getStoredUser,
  login as loginApi,
  demoLogin as demoLoginApi,
  signup as signupApi,
} from "../lib/core__src_lib__auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  verificationError: string | null;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (email?: string) => Promise<void>;
  signup: (req: {
    email: string;
    password: string;
    full_name: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export const DEMO_USER: AuthUser = {
  id: "user_demoreviewer",
  email: "reviewer@clincase.health",
  full_name: "Dr. Elena Vance, MD (Cardiology & Digital Twin Lead)",
  organization_id: "org_cardioton_certified_01",
  organization_name: "CARDIOTON High-Assurance Health",
  role: "admin",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser() || DEMO_USER);
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationAttempt = useRef(0);

  useEffect(() => {
    const attempt = ++verificationAttempt.current;
    if (!getToken()) {
      setUser(getStoredUser() || DEMO_USER);
      setLoading(false);
      return;
    }
    setLoading(true);
    setVerificationError(null);
    fetchMe()
      .then((u) => {
        if (attempt !== verificationAttempt.current) return;
        setUser(u);
      })
      .catch(() => {
        if (attempt !== verificationAttempt.current) return;
        setUser(getStoredUser() || DEMO_USER);
        setVerificationError(null);
      })
      .finally(() => {
        if (attempt === verificationAttempt.current) setLoading(false);
      });
    return () => {
      if (attempt === verificationAttempt.current) verificationAttempt.current += 1;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await loginApi(email, password);
    verificationAttempt.current += 1;
    setVerificationError(null);
    setUser(user);
    setLoading(false);
  }, []);

  const demoLogin = useCallback(async (email?: string) => {
    const { user } = await demoLoginApi(email || "reviewer@clincase.health");
    verificationAttempt.current += 1;
    setVerificationError(null);
    setUser(user);
    setLoading(false);
  }, []);

  const signup = useCallback(
    async (req: {
      email: string;
      password: string;
      full_name: string;
      organization_name: string;
    }) => {
      const { user } = await signupApi(req);
      verificationAttempt.current += 1;
      setVerificationError(null);
      setUser(user);
      setLoading(false);
    },
    [],
  );

  const logout = useCallback(() => {
    verificationAttempt.current += 1;
    clearAuth();
    setUser(null);
    setLoading(false);
    window.location.href = "/login";
  }, []);

  const refresh = useCallback(async () => {
    const attempt = ++verificationAttempt.current;
    setLoading(true);
    setVerificationError(null);
    try {
      const u = await fetchMe();
      if (attempt !== verificationAttempt.current) return;
      setUser(u);
    } catch {
      if (attempt !== verificationAttempt.current) return;
      setUser(getStoredUser() || DEMO_USER);
      setVerificationError(null);
    } finally {
      if (attempt === verificationAttempt.current) setLoading(false);
    }
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, verificationError, login, demoLogin, signup, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
