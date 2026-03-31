/**
 * 기기 내 localStorage 데이터 → Supabase 서버로 마이그레이션
 * 로그인 후 한 번만 실행됨
 */
import { supabase } from "./supabase";
import * as db from "./supabase-store";
import type { Tour, Waiver, Comment } from "../types";

const MIGRATED_KEY = "nos_divers_migrated";
const STORAGE_KEY = "nos_divers_data";
const PROFILE_KEY = "nos_divers_profile";

interface LocalAppData {
  tours: Tour[];
  waivers: Waiver[];
  comments: Comment[];
  nextTourId?: number;
  nextParticipantId?: number;
  nextExpenseId?: number;
  nextWaiverId?: number;
  nextCommentId?: number;
}

/** Check if migration is needed (local data exists and hasn't been migrated) */
export function needsMigration(): boolean {
  if (localStorage.getItem(MIGRATED_KEY) === "true") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as LocalAppData;
    return data.tours?.length > 0 || data.waivers?.length > 0;
  } catch {
    return false;
  }
}

/** Perform migration from localStorage to Supabase */
export async function migrateLocalData(
  onProgress?: (msg: string) => void,
): Promise<{ success: boolean; tourCount: number; error?: string }> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { success: false, tourCount: 0, error: "로그인이 필요합니다" };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { success: true, tourCount: 0 };

  let data: LocalAppData;
  try {
    data = JSON.parse(raw);
  } catch {
    return { success: false, tourCount: 0, error: "로컬 데이터를 파싱할 수 없습니다" };
  }

  const tours = (data.tours || []).filter((t) => !t.deletedAt);
  let migratedCount = 0;

  // ID mapping: old local ID → new server ID
  const tourIdMap = new Map<number, number>();
  const participantIdMap = new Map<number, number>();

  // 1. Migrate profile
  onProgress?.("프로필 이전 중...");
  try {
    const profileRaw = localStorage.getItem(PROFILE_KEY);
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      await db.setProfile({
        name: profile.name || "",
        email: profile.email || "",
        grade: profile.grade || "멤버",
        phone: profile.phone,
        birthDate: profile.birthDate,
        divingLevel: profile.divingLevel,
        emergencyContact: profile.emergencyContact,
      });
    }
  } catch {
    // Profile migration is best-effort
  }

  // 2. Migrate tours
  for (const tour of tours) {
    onProgress?.(`투어 이전 중: ${tour.name}`);
    try {
      // Check if invite code already exists (another user may have migrated this tour)
      const existing = await db.lookupTourByInvite(tour.inviteCode);
      if (existing) {
        // Tour already exists — just join as member
        tourIdMap.set(tour.id, existing.id);
        try {
          const profile = await db.getProfile();
          await db.joinTour(tour.inviteCode, profile.name || "이전된 사용자");
        } catch {
          // Already a member, that's fine
        }
        // Still need to map participant IDs for expenses
        const serverTour = await db.getTourById(existing.id);
        if (serverTour) {
          for (const localP of tour.participants) {
            const serverP = serverTour.participants.find((p) => p.name === localP.name);
            if (serverP) {
              participantIdMap.set(localP.id, serverP.id);
            }
          }
        }
        migratedCount++;
        continue;
      }

      // Create new tour
      const newTour = await db.createTour({
        name: tour.name,
        date: tour.date,
        location: tour.location,
        accessCode: tour.accessCode,
        createdBy: tour.createdBy,
      });
      tourIdMap.set(tour.id, newTour.id);

      // Map the creator participant (automatically created by createTour)
      if (newTour.participants.length > 0 && tour.participants.length > 0) {
        participantIdMap.set(tour.participants[0].id, newTour.participants[0].id);
      }

      // Add remaining participants
      for (let i = 1; i < tour.participants.length; i++) {
        const localP = tour.participants[i];
        try {
          const newP = await db.addParticipant(newTour.id, localP.name, localP.addedBy);
          participantIdMap.set(localP.id, newP.id);
        } catch {
          // Skip duplicate participants
        }
      }

      // Add expenses (with receipt image upload)
      for (const expense of tour.expenses) {
        try {
          const newPaidBy = participantIdMap.get(expense.paidBy) || expense.paidBy;
          const newSplitAmong = expense.splitAmong.map(
            (id) => participantIdMap.get(id) || id,
          );
          let newSplitAmounts: Record<string, number> | null = null;
          if (expense.splitAmounts) {
            newSplitAmounts = {};
            for (const [key, val] of Object.entries(expense.splitAmounts)) {
              const newId = participantIdMap.get(Number(key)) || Number(key);
              newSplitAmounts[String(newId)] = val;
            }
          }

          await db.addExpense({
            tourId: newTour.id,
            name: expense.name,
            amount: expense.amount,
            currency: expense.currency,
            exchangeRate: expense.exchangeRate,
            paidBy: newPaidBy,
            splitAmong: newSplitAmong,
            splitType: expense.splitType,
            splitAmounts: newSplitAmounts,
            receiptImage: expense.receiptImage, // base64 → auto-uploaded by supabase-store
            createdAt: expense.createdAt,
          });
        } catch {
          // Skip failed expenses
        }
      }

      migratedCount++;
    } catch (e: any) {
      console.error(`Tour migration failed: ${tour.name}`, e);
    }
  }

  // 3. Migrate waivers
  const waivers = data.waivers || [];
  for (const waiver of waivers) {
    onProgress?.(`면책동의서 이전 중: ${waiver.signerName}`);
    try {
      const newTourId = tourIdMap.get(waiver.tourId);
      if (!newTourId) continue;

      await db.createWaiver({
        tourId: newTourId,
        signerName: waiver.signerName,
        personalInfo: waiver.personalInfo,
        healthChecklist: waiver.healthChecklist,
        healthOther: waiver.healthOther ?? undefined,
        signatureImage: waiver.signatureImage, // base64 → auto-uploaded
        agreed: waiver.agreed,
      });
    } catch {
      // Skip failed waivers
    }
  }

  // 4. Migrate comments
  const comments = data.comments || [];
  for (const comment of comments) {
    try {
      const newTourId = tourIdMap.get(comment.tourId);
      if (!newTourId) continue;

      await db.addComment({
        tourId: newTourId,
        authorName: comment.authorName,
        text: comment.text,
      });
    } catch {
      // Skip failed comments
    }
  }

  // 5. Migrate app settings
  try {
    void localStorage.getItem("nos_divers_admin_pw");
    const accountPw = localStorage.getItem("nos_divers_account_pw");
    if (accountPw) {
      await db.setAccountPassword(accountPw);
    }
    // Hidden tours: remap IDs
    try {
      const hiddenRaw = localStorage.getItem("nos_divers_hidden_tours");
      if (hiddenRaw) {
        const hiddenIds = JSON.parse(hiddenRaw) as number[];
        const newHiddenIds = hiddenIds
          .map((id) => tourIdMap.get(id))
          .filter((id): id is number => id !== undefined);
        if (newHiddenIds.length > 0) {
          await db.setHiddenTourIds(newHiddenIds);
        }
      }
    } catch {}
  } catch {}

  // Mark as migrated
  localStorage.setItem(MIGRATED_KEY, "true");

  onProgress?.("마이그레이션 완료!");

  return { success: true, tourCount: migratedCount };
}
