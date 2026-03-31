import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  tours,
  participants,
  expenses,
  waivers,
  InsertTour,
  InsertParticipant,
  InsertExpense,
  InsertWaiver,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== Users =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Tours =====

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getAllTours() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tours).orderBy(desc(tours.createdAt));
}

export async function getTourById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTourByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tours).where(eq(tours.inviteCode, inviteCode)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTour(data: { name: string; date: string; location: string; accessCode: string; createdBy: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inviteCode = generateInviteCode();
  const result = await db.insert(tours).values({
    name: data.name,
    date: data.date,
    location: data.location,
    inviteCode,
    accessCode: data.accessCode,
    createdBy: data.createdBy,
  });
  const tourId = result[0].insertId;
  return { id: tourId, inviteCode, accessCode: data.accessCode };
}

export async function deleteTour(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 관련 데이터 삭제
  await db.delete(participants).where(eq(participants.tourId, id));
  await db.delete(expenses).where(eq(expenses.tourId, id));
  await db.delete(waivers).where(eq(waivers.tourId, id));
  await db.delete(tours).where(eq(tours.id, id));
}

// ===== Participants =====

export async function getParticipantsByTour(tourId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(participants).where(eq(participants.tourId, tourId));
}

export async function addParticipant(tourId: number, name: string, modifiedBy: string = "") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(participants).values({ tourId, name, lastModifiedBy: modifiedBy || name });
  return { id: result[0].insertId, tourId, name, lastModifiedBy: modifiedBy || name };
}

export async function removeParticipant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(participants).where(eq(participants.id, id));
}

// ===== Expenses =====

export async function getExpensesByTour(tourId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.tourId, tourId));
}

export async function addExpense(data: {
  tourId: number;
  name: string;
  amount: number;
  paidBy: number;
  splitAmong: number[];
  splitType?: "equal" | "custom";
  splitAmounts?: Record<string, number>;
  lastModifiedBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(expenses).values({
    tourId: data.tourId,
    name: data.name,
    amount: data.amount,
    paidBy: data.paidBy,
    splitAmong: JSON.stringify(data.splitAmong),
    splitType: data.splitType || "equal",
    splitAmounts: data.splitAmounts ? JSON.stringify(data.splitAmounts) : null,
    lastModifiedBy: data.lastModifiedBy || "",
  });
  return { id: result[0].insertId };
}

export async function removeExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(eq(expenses.id, id));
}

// ===== Waivers =====

export async function getWaiversByTour(tourId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waivers).where(eq(waivers.tourId, tourId)).orderBy(desc(waivers.signedAt));
}

export async function createWaiver(data: {
  tourId: number;
  signerName: string;
  personalInfo: string;
  healthChecklist: string;
  healthOther: string;
  signatureImage: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(waivers).values({
    tourId: data.tourId,
    signerName: data.signerName,
    personalInfo: data.personalInfo,
    healthChecklist: data.healthChecklist,
    healthOther: data.healthOther || "",
    signatureImage: data.signatureImage,
  });
  return { id: result[0].insertId };
}

export async function deleteWaiver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(waivers).where(eq(waivers.id, id));
}
