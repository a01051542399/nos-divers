/**
 * React Native 데이터 훅
 * Supabase 데이터 레이어를 React 상태로 연결
 */
import { useState, useEffect, useCallback } from "react";
import * as db from "../lib/supabase-store";
import type { Tour, Waiver, Comment } from "../types";
import type { UserProfile } from "../store";

// ─── useTours ───

export function useTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.listTours();
      setTours(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "데이터를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tours, loading, error, refresh };
}

// ─── useTourDetail ───

export function useTourDetail(tourId: number) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getTourById(tourId);
      setTour(data || null);
      setError(null);
    } catch (e: any) {
      setError(e.message || "투어를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tour, loading, error, refresh };
}

// ─── useWaivers ───

export function useWaivers(tourId?: number) {
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = tourId
        ? await db.listWaiversByTour(tourId)
        : await db.listAllWaivers();
      setWaivers(data);
    } catch {
      setWaivers([]);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { waivers, loading, refresh };
}

// ─── useComments ───

export function useComments(tourId: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.listComments(tourId);
      setComments(data);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addComment = useCallback(
    async (authorName: string, text: string) => {
      await db.addComment({ tourId, authorName, text });
      await refresh();
    },
    [tourId, refresh],
  );

  const removeComment = useCallback(
    async (commentId: number) => {
      await db.deleteComment(commentId);
      await refresh();
    },
    [refresh],
  );

  return { comments, loading, refresh, addComment, removeComment };
}

// ─── useProfile ───

export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile>({
    name: "",
    email: "",
    grade: "멤버",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getProfile();
      setProfileState(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(async (p: UserProfile) => {
    await db.setProfile(p);
    setProfileState(p);
  }, []);

  return { profile, loading, refresh, updateProfile };
}

// ─── useAppSettings ───

export function useAppSettings() {
  const [settings, setSettings] = useState<{
    accountPassword: string | null;
    hiddenTourIds: number[];
  }>({ accountPassword: null, hiddenTourIds: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getAppSettings();
      setSettings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { settings, loading, refresh };
}

// ─── useTrashTours ───

export function useTrashTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getTrashTours();
      setTours(data);
    } catch {
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tours, loading, refresh };
}
