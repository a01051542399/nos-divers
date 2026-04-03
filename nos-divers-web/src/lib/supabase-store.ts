/**
 * Supabase 서버 기반 데이터 레이어
 * 기존 store.ts의 localStorage 함수들을 Supabase DB + Storage로 대체
 */
import { supabase } from "./supabase";
import type {
  Tour, Participant, Expense, Waiver, Comment,
  WaiverPersonalInfo,
} from "../types";

// ─── Helpers ───

/** base64 data URL → Supabase Storage upload → signed URL */
async function uploadImage(
  path: string,
  base64Data: string,
): Promise<string> {
  // Extract mime and raw base64
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid base64 data URL");
  const mime = match[1];
  const raw = match[2];
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from("images")
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw error;

  // Get signed URL (1 year)
  const { data: urlData } = await supabase.storage
    .from("images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!urlData?.signedUrl) throw new Error("이미지 URL 생성에 실패했습니다");
  return urlData.signedUrl;
}

/** DB snake_case row → camelCase Participant */
function toParticipant(row: any): Participant {
  return {
    id: row.id,
    tourId: row.tour_id,
    name: row.name,
    addedBy: row.added_by ?? undefined,
    lastModifiedBy: row.last_modified_by ?? undefined,
    createdAt: row.created_at,
  };
}

/** DB snake_case row → camelCase Expense */
function toExpense(row: any): Expense {
  return {
    id: row.id,
    tourId: row.tour_id,
    name: row.name,
    amount: Number(row.amount),
    currency: row.currency || "KRW",
    exchangeRate: Number(row.exchange_rate) || 1,
    paidBy: row.paid_by,
    splitAmong: row.split_among || [],
    splitType: row.split_type || "equal",
    splitAmounts: row.split_amounts || null,
    receiptImage: row.receipt_url ?? undefined,
    lastModifiedBy: row.last_modified_by ?? undefined,
    createdAt: row.created_at,
  };
}

/** DB snake_case row → camelCase Waiver */
function toWaiver(row: any): Waiver {
  return {
    id: row.id,
    tourId: row.tour_id,
    signerName: row.signer_name,
    personalInfo: row.personal_info as WaiverPersonalInfo,
    healthChecklist: row.health_checklist as boolean[],
    healthOther: row.health_other ?? null,
    signatureImage: row.signature_url || "",
    signedAt: row.signed_at,
    agreed: row.agreed ?? true,
  };
}

/** DB snake_case row → camelCase Comment */
function toComment(row: any): Comment {
  return {
    id: row.id,
    tourId: row.tour_id,
    authorName: row.author_name,
    text: row.text,
    createdAt: row.created_at,
    edited: row.edited ?? false,
  };
}

/** Assemble full Tour object from DB (3 parallel queries) */
async function assembleTour(tourRow: any): Promise<Tour> {
  const tourId = tourRow.id;
  const [pRes, eRes] = await Promise.all([
    supabase.from("participants").select("*").eq("tour_id", tourId).order("id"),
    supabase.from("expenses").select("*").eq("tour_id", tourId).order("id"),
  ]);
  if (pRes.error) console.error("participants query error:", pRes.error);
  if (eRes.error) console.error("expenses query error:", eRes.error);

  return {
    id: tourRow.id,
    name: tourRow.name,
    date: tourRow.date || "",
    location: tourRow.location || "",
    inviteCode: tourRow.invite_code,
    accessCode: tourRow.access_code,
    createdBy: tourRow.created_by_name || "",
    participants: (pRes.data || []).map(toParticipant),
    expenses: (eRes.data || []).map(toExpense),
    createdAt: tourRow.created_at,
    updatedAt: tourRow.updated_at,
    deletedAt: tourRow.deleted_at ?? undefined,
  };
}

// ─── Tour Operations ───

export async function listTours(): Promise<Tour[]> {
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Assemble each tour with participants/expenses
  const tours = await Promise.all(data.map(assembleTour));
  return tours;
}

export async function getTourById(id: number): Promise<Tour | undefined> {
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return undefined;
  return assembleTour(data);
}

export async function createTour(input: {
  name: string;
  date: string;
  location: string;
  accessCode: string;
  createdBy: string;
}): Promise<Tour> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요합니다");

  // Use RPC to create tour + member + participant atomically (bypasses RLS)
  const { data, error } = await supabase.rpc("create_tour_rpc", {
    p_name: input.name,
    p_date: input.date,
    p_location: input.location,
    p_access_code: input.accessCode || "0000",
    p_created_by_name: input.createdBy,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const tourId = data.tourId;
  const tour = await getTourById(tourId);
  if (!tour) throw new Error("투어 생성 후 조회에 실패했습니다");
  return tour;
}

export async function editTour(
  tourId: number,
  updates: { name?: string; date?: string; location?: string },
): Promise<void> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.location !== undefined) payload.location = updates.location;

  const { error } = await supabase
    .from("tours")
    .update(payload)
    .eq("id", tourId);
  if (error) throw error;
}

export async function softDeleteTour(tourId: number): Promise<void> {
  const { error } = await supabase
    .from("tours")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", tourId);
  if (error) throw error;
}

export async function restoreTour(tourId: number): Promise<void> {
  const { error } = await supabase
    .from("tours")
    .update({ deleted_at: null })
    .eq("id", tourId);
  if (error) throw error;
}

export async function deleteTour(tourId: number): Promise<void> {
  // Storage 파일 정리 (best-effort: 실패해도 DB 삭제는 진행)
  const storageFolders = [
    `receipts/${tourId}`,
    `signatures/${tourId}`,
  ];

  for (const folder of storageFolders) {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from("images")
        .list(folder);

      if (!listError && files && files.length > 0) {
        const paths = files.map((f) => `${folder}/${f.name}`);
        const { error: removeError } = await supabase.storage
          .from("images")
          .remove(paths);
        if (removeError) {
          console.warn(`Storage 삭제 실패 (${folder}):`, removeError.message);
        }
      }
    } catch (e) {
      console.warn(`Storage 정리 중 오류 (${folder}):`, e);
    }
  }

  // Cascade delete handles participants, expenses, waivers, comments
  const { error } = await supabase
    .from("tours")
    .delete()
    .eq("id", tourId);
  if (error) throw error;
}

export async function getTrashTours(): Promise<Tour[]> {
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  if (!data) return [];
  return Promise.all(data.map(assembleTour));
}

export async function cleanupTrash(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("tours")
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", sevenDaysAgo);
  if (error) throw error;
}

export async function verifyTourAccessCode(
  tourId: number,
  code: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("tours")
    .select("access_code")
    .eq("id", tourId)
    .single();
  return data?.access_code === code;
}

// ─── Join Tour (RPC) ───

export async function lookupTourByInvite(
  code: string,
): Promise<{ id: number; name: string; date: string; location: string; createdByName: string } | null> {
  const { data, error } = await supabase.rpc("lookup_tour_by_invite", {
    p_code: code.toUpperCase(),
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location,
    createdByName: row.created_by_name,
  };
}

export async function joinTour(
  inviteCode: string,
  userName: string,
): Promise<{ tourId: number; participantId: number; tourName: string } | { error: string }> {
  const { data, error } = await supabase.rpc("join_tour", {
    p_invite_code: inviteCode.toUpperCase(),
    p_user_name: userName,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return {
    tourId: data.tourId,
    participantId: data.participantId,
    tourName: data.tourName,
  };
}

// ─── Participant Operations ───

export async function addParticipant(
  tourId: number,
  name: string,
  addedBy?: string,
): Promise<Participant> {
  const { data, error } = await supabase
    .from("participants")
    .insert({
      tour_id: tourId,
      name,
      added_by: addedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return toParticipant(data);
}

export async function removeParticipant(
  tourId: number,
  participantId: number,
): Promise<void> {
  // Update expenses: remove from split_among arrays
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, split_among, split_type, split_amounts")
    .eq("tour_id", tourId);

  if (expenses) {
    for (const exp of expenses) {
      const newSplitAmong = (exp.split_among || []).filter(
        (id: number) => id !== participantId,
      );
      const updates: any = { split_among: newSplitAmong };

      if (exp.split_type === "custom" && exp.split_amounts) {
        const amounts = { ...exp.split_amounts };
        delete amounts[String(participantId)];
        updates.split_amounts = amounts;
      }

      if (newSplitAmong.length === 0) {
        // Remove expense if no one left
        await supabase.from("expenses").delete().eq("id", exp.id);
      } else {
        await supabase.from("expenses").update(updates).eq("id", exp.id);
      }
    }
  }

  // Delete participant
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", participantId);
  if (error) throw error;
}

// ─── Expense Operations ───

export async function addExpense(input: {
  tourId: number;
  name: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  paidBy: number;
  splitAmong: number[];
  splitType?: "equal" | "custom";
  splitAmounts?: Record<string, number> | null;
  receiptImage?: string;
  createdAt?: string;
}): Promise<Expense> {
  let receiptUrl: string | undefined;
  if (input.receiptImage && input.receiptImage.startsWith("data:")) {
    // Upload receipt to Storage
    const tempId = Date.now();
    receiptUrl = await uploadImage(
      `receipts/${input.tourId}/${tempId}.jpg`,
      input.receiptImage,
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      tour_id: input.tourId,
      name: input.name,
      amount: input.amount,
      currency: input.currency || "KRW",
      exchange_rate: input.exchangeRate || 1,
      paid_by: input.paidBy,
      split_among: input.splitAmong,
      split_type: input.splitType || "equal",
      split_amounts: input.splitAmounts || null,
      receipt_url: receiptUrl || null,
      created_at: input.createdAt || new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return toExpense(data);
}

export async function editExpense(
  tourId: number,
  expenseId: number,
  updates: {
    name?: string;
    amount?: number;
    currency?: string;
    exchangeRate?: number;
    paidBy?: number;
    splitAmong?: number[];
    splitType?: "equal" | "custom";
    splitAmounts?: Record<string, number> | null;
    receiptImage?: string;
    lastModifiedBy?: string;
  },
): Promise<void> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.exchangeRate !== undefined) payload.exchange_rate = updates.exchangeRate;
  if (updates.paidBy !== undefined) payload.paid_by = updates.paidBy;
  if (updates.splitAmong !== undefined) payload.split_among = updates.splitAmong;
  if (updates.splitType !== undefined) payload.split_type = updates.splitType;
  if (updates.splitAmounts !== undefined) payload.split_amounts = updates.splitAmounts;
  if (updates.lastModifiedBy) payload.last_modified_by = updates.lastModifiedBy;

  // Handle receipt image upload
  if (updates.receiptImage !== undefined) {
    if (updates.receiptImage && updates.receiptImage.startsWith("data:")) {
      payload.receipt_url = await uploadImage(
        `receipts/${tourId}/${expenseId}.jpg`,
        updates.receiptImage,
      );
    } else {
      payload.receipt_url = updates.receiptImage || null;
    }
  }

  const { error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", expenseId);
  if (error) throw error;
}

export async function removeExpense(
  _tourId: number,
  expenseId: number,
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);
  if (error) throw error;
}

// ─── Waiver Operations ───

export async function createWaiver(input: {
  tourId: number;
  signerName: string;
  personalInfo: Waiver["personalInfo"];
  healthChecklist: boolean[] | string;
  healthOther?: string;
  signatureImage: string;
  agreed?: boolean;
}): Promise<Waiver> {
  let signatureUrl = "";
  if (input.signatureImage && input.signatureImage.startsWith("data:")) {
    const tempId = Date.now();
    signatureUrl = await uploadImage(
      `signatures/${input.tourId}/${tempId}.png`,
      input.signatureImage,
    );
  }

  const { data, error } = await supabase
    .from("waivers")
    .insert({
      tour_id: input.tourId,
      signer_name: input.signerName,
      personal_info: input.personalInfo,
      health_checklist: input.healthChecklist,
      health_other: input.healthOther || null,
      signature_url: signatureUrl,
      agreed: input.agreed ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return toWaiver(data);
}

export async function listWaiversByTour(tourId: number): Promise<Waiver[]> {
  const { data, error } = await supabase
    .from("waivers")
    .select("*")
    .eq("tour_id", tourId)
    .order("signed_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toWaiver);
}

export async function listAllWaivers(): Promise<Waiver[]> {
  // Get all waivers for tours the user is a member of
  const { data, error } = await supabase
    .from("waivers")
    .select("*")
    .order("signed_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toWaiver);
}

export async function deleteWaiver(waiverId: number): Promise<void> {
  const { error } = await supabase
    .from("waivers")
    .delete()
    .eq("id", waiverId);
  if (error) throw error;
}

// ─── Comment Operations ───

export async function listComments(tourId: number): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("tour_id", tourId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(toComment);
}

export async function addComment(input: {
  tourId: number;
  authorName: string;
  text: string;
}): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      tour_id: input.tourId,
      author_name: input.authorName,
      text: input.text,
    })
    .select()
    .single();
  if (error) throw error;
  return toComment(data);
}

export async function editComment(
  commentId: number,
  newText: string,
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .update({ text: newText, edited: true })
    .eq("id", commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: number): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;
}

// ─── Profile Operations ───

export interface UserProfile {
  name: string;
  email: string;
  grade: string;
  phone?: string;
  birthDate?: string;
  divingLevel?: string;
  emergencyContact?: string;
}

export async function getProfile(): Promise<UserProfile> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { name: "", email: "", grade: "멤버" };

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return { name: "", email: user.email || "", grade: "멤버" };

  return {
    name: data.name || "",
    email: data.email || "",
    grade: data.grade || "멤버",
    phone: data.phone ?? undefined,
    birthDate: data.birth_date ?? undefined,
    divingLevel: data.diving_level ?? undefined,
    emergencyContact: data.emergency_contact ?? undefined,
  };
}

export async function setProfile(profile: UserProfile): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      name: profile.name,
      email: profile.email,
      grade: profile.grade || "멤버",
      phone: profile.phone || null,
      birth_date: profile.birthDate || null,
      diving_level: profile.divingLevel || null,
      emergency_contact: profile.emergencyContact || null,
    });
  if (error) throw error;
}

// ─── App Settings (per-user) ───

export async function getAppSettings(): Promise<{
  accountPassword: string | null;
  hiddenTourIds: number[];
}> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { accountPassword: null, hiddenTourIds: [] };

  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return { accountPassword: null, hiddenTourIds: [] };

  return {
    accountPassword: data.account_password,
    hiddenTourIds: data.hidden_tour_ids || [],
  };
}

export async function setAccountPassword(password: string): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const current = await getAppSettings();
  await supabase.from("app_settings").upsert({
    user_id: user.id,
    account_password: password,
    hidden_tour_ids: current.hiddenTourIds,
  });
}

export async function setHiddenTourIds(ids: number[]): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const current = await getAppSettings();
  await supabase.from("app_settings").upsert({
    user_id: user.id,
    account_password: current.accountPassword,
    hidden_tour_ids: ids,
  });
}

export async function verifyAdminPassword(pw: string): Promise<boolean> {
  const { data } = await supabase.rpc("verify_admin_password", {
    p_password: pw,
  });
  return data === true;
}

// ─── Data Stats (Admin) ───

export async function getDataStats(): Promise<{
  tourCount: number;
  participantCount: number;
  expenseCount: number;
  waiverCount: number;
  commentCount: number;
  totalExpenseKRW: number;
}> {
  const [tours, participants, expenses, waivers, comments] = await Promise.all([
    supabase.from("tours").select("id", { count: "exact", head: true }),
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase.from("expenses").select("id, amount, exchange_rate"),
    supabase.from("waivers").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
  ]);

  const totalExpenseKRW = (expenses.data || []).reduce(
    (sum: number, e: any) => sum + Number(e.amount) * (Number(e.exchange_rate) || 1),
    0,
  );

  return {
    tourCount: tours.count || 0,
    participantCount: participants.count || 0,
    expenseCount: expenses.count || 0,
    waiverCount: waivers.count || 0,
    commentCount: comments.count || 0,
    totalExpenseKRW,
  };
}
