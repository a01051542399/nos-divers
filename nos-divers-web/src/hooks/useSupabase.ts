/**
 * React hooks for Supabase data fetching
 * Provides loading states and refresh capabilities for all screens
 */
import { useState, useEffect, useCallback } from "react";
import * as db from "../lib/supabase-store";
import type { Tour, Waiver, Comment, Announcement } from "../types";

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

  useEffect(() => { refresh(); }, [refresh]);

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

  useEffect(() => { refresh(); }, [refresh]);

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

  useEffect(() => { refresh(); }, [refresh]);

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

  useEffect(() => { refresh(); }, [refresh]);

  return { comments, loading, refresh };
}

// ─── useProfile ───

export function useProfile() {
  const [profile, setProfileState] = useState<db.UserProfile>({
    name: "", email: "", grade: "멤버",
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

  useEffect(() => { refresh(); }, [refresh]);

  const updateProfile = useCallback(async (p: db.UserProfile) => {
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

  useEffect(() => { refresh(); }, [refresh]);

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

  useEffect(() => { refresh(); }, [refresh]);

  return { tours, loading, refresh };
}

// ─── useAnnouncements ───

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.listAnnouncements();
      setAnnouncements(data);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { announcements, loading, refresh };
}

// ─── useIsAdmin ───

export function useIsAdmin(refreshKey: number = 0) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const ok = await db.amIAdmin();
      setIsAdmin(ok);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  return { isAdmin, loading, refresh };
}

// ─── useUnreadAnnouncementCount ───

export function useUnreadAnnouncementCount(refreshKey: number = 0) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const n = await db.getUnreadAnnouncementCount();
      setCount(n);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  return { count, refresh };
}
