import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { trpc } from "../lib/trpc";
import { clearToken, getCachedUser, setCachedUser } from "../lib/auth";
import type { AuthUser } from "../shared/types";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (meQuery.data !== undefined) {
      setUser(meQuery.data);
      if (meQuery.data) {
        setCachedUser(meQuery.data);
      }
      setLoading(false);
    } else if (meQuery.error) {
      setLoading(false);
    }
  }, [meQuery.data, meQuery.error]);

  // Load cached user on mount
  useEffect(() => {
    getCachedUser().then((cached) => {
      if (cached && !user) {
        setUser(cached);
      }
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearToken();
      // Call server logout
      if (Platform.OS === "web") {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      }
      setUser(null);
    } catch {}
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    logout,
    refetch: meQuery.refetch,
  };
}
