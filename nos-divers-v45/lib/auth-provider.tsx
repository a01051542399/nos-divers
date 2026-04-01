import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import * as db from "./supabase-store";
import { Platform } from "react-native";

// Lazy imports to avoid crashes on native
let WebBrowser: typeof import("expo-web-browser") | null = null;
let makeRedirectUri: typeof import("expo-auth-session").makeRedirectUri | null = null;

try {
  WebBrowser = require("expo-web-browser");
  const authSession = require("expo-auth-session");
  makeRedirectUri = authSession.makeRedirectUri;
  WebBrowser?.maybeCompleteAuthSession();
} catch {
  // Silently fail if modules not available
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithKakao: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signInWithKakao: async () => {},
  signInWithGoogle: async () => {},
  resetPassword: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/** Get redirect URI for OAuth */
function getRedirectUrl() {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  if (makeRedirectUri) {
    return makeRedirectUri({ scheme: "com.nosdivers.app" });
  }
  return "com.nosdivers.app://callback";
}

/** Sync auth user metadata → profiles table (only fills in empty fields) */
async function syncProfileFromUser(user: User) {
  try {
    const meta = user.user_metadata || {};
    const existing = await db.getProfile();

    const name = existing.name || meta.full_name || meta.name || meta.preferred_username || "";
    const email = existing.email || user.email || meta.email || "";

    if (name !== existing.name || email !== existing.email) {
      await db.setProfile({
        ...existing,
        name,
        email,
        grade: existing.grade || "멤버",
      });
    }
  } catch {
    // Profile sync is best-effort
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) syncProfileFromUser(s.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) syncProfileFromUser(s.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase가 설정되지 않았습니다" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 올바르지 않습니다" : error.message };
    return { error: null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase가 설정되지 않았습니다" };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return { error: error.message };
    await supabase.auth.signOut();
    return { error: null };
  }, []);

  const signInWithKakao = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const redirectUrl = getRedirectUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: redirectUrl,
        scopes: "profile_nickname profile_image",
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error || !data.url) return;

    if (Platform.OS !== "web") {
      const result = await WebBrowser!.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const redirectUrl = getRedirectUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error || !data.url) return;

    if (Platform.OS !== "web") {
      const result = await WebBrowser!.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase가 설정되지 않았습니다" };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl(),
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signUpWithEmail, signInWithKakao, signInWithGoogle, resetPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
