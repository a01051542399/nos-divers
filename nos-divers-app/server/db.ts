import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { env } from "./env";
import path from "path";

// ── SQLite DB (파일 기반, 별도 설치 불필요) ───────────
let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

function getDb() {
  if (!_db) {
    const dbPath = env.DATABASE_PATH || path.join(process.cwd(), "data", "nos-divers.db");

    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    const fs = require("fs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");

    _db = drizzle(_sqlite, { schema });

    // Auto-create tables
    _sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        name TEXT,
        email TEXT,
        profile_image TEXT,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_signed_in TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT DEFAULT '',
        location TEXT DEFAULT '',
        invite_code TEXT NOT NULL UNIQUE,
        access_code TEXT NOT NULL DEFAULT '0000',
        created_by TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        last_modified_by TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        paid_by INTEGER NOT NULL,
        split_among TEXT NOT NULL,
        split_type TEXT DEFAULT 'equal',
        split_amounts TEXT,
        last_modified_by TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS waivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tour_id INTEGER NOT NULL,
        signer_name TEXT NOT NULL,
        personal_info TEXT NOT NULL,
        health_checklist TEXT NOT NULL,
        health_other TEXT,
        signature_image TEXT NOT NULL,
        signed_at TEXT DEFAULT (datetime('now')),
        agreed INTEGER DEFAULT 1
      );
    `);

    console.log("✅ SQLite DB initialized:", dbPath);
  }
  return _db;
}

// ── User operations ──────────────────────────────────
export async function findOrCreateUser(data: {
  providerId: string;
  provider: string;
  name: string | null;
  email: string | null;
  profileImage: string | null;
}) {
  const db = getDb();
  const existing = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.providerId, data.providerId))
    .limit(1)
    .all();

  if (existing.length > 0) {
    db.update(schema.users)
      .set({
        lastSignedIn: new Date().toISOString(),
        name: data.name || existing[0].name,
        email: data.email || existing[0].email,
        profileImage: data.profileImage || existing[0].profileImage,
      })
      .where(eq(schema.users.id, existing[0].id))
      .run();

    return { ...existing[0], ...data, id: existing[0].id };
  }

  const isAdmin =
    data.email && env.ADMIN_EMAILS.includes(data.email) ? "admin" : "user";

  const result = db.insert(schema.users).values({
    ...data,
    role: isAdmin,
  }).run();

  return {
    id: Number(result.lastInsertRowid),
    ...data,
    role: isAdmin,
    createdAt: new Date().toISOString(),
    lastSignedIn: new Date().toISOString(),
  };
}

export async function getUserById(id: number) {
  const db = getDb();
  const rows = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1)
    .all();
  return rows[0] || null;
}

// ── Tour operations ──────────────────────────────────
export async function listTours() {
  const db = getDb();
  return db
    .select({
      id: schema.tours.id,
      name: schema.tours.name,
      date: schema.tours.date,
      location: schema.tours.location,
      inviteCode: schema.tours.inviteCode,
      createdBy: schema.tours.createdBy,
      createdAt: schema.tours.createdAt,
    })
    .from(schema.tours)
    .orderBy(desc(schema.tours.createdAt))
    .all();
}

export async function getTourById(id: number) {
  const db = getDb();
  const tourRows = db
    .select()
    .from(schema.tours)
    .where(eq(schema.tours.id, id))
    .limit(1)
    .all();

  if (tourRows.length === 0) return null;

  const tour = tourRows[0];
  const tourParticipants = db
    .select()
    .from(schema.participants)
    .where(eq(schema.participants.tourId, id))
    .all();

  const tourExpenses = db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.tourId, id))
    .all();

  return {
    ...tour,
    participants: tourParticipants,
    expenses: tourExpenses.map((e) => ({
      ...e,
      splitAmong: JSON.parse(e.splitAmong || "[]"),
      splitAmounts: e.splitAmounts ? JSON.parse(e.splitAmounts) : null,
    })),
  };
}

export async function getTourByInviteCode(code: string) {
  const db = getDb();
  const rows = db
    .select({
      id: schema.tours.id,
      name: schema.tours.name,
      date: schema.tours.date,
      location: schema.tours.location,
      inviteCode: schema.tours.inviteCode,
      createdBy: schema.tours.createdBy,
    })
    .from(schema.tours)
    .where(eq(schema.tours.inviteCode, code))
    .limit(1)
    .all();
  return rows[0] || null;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createTour(data: {
  name: string;
  date: string;
  location: string;
  accessCode: string;
  createdBy: string;
}) {
  const db = getDb();
  const inviteCode = generateInviteCode();

  const result = db.insert(schema.tours).values({
    ...data,
    inviteCode,
  }).run();

  return { id: Number(result.lastInsertRowid), inviteCode };
}

export async function deleteTour(id: number) {
  const db = getDb();
  db.delete(schema.waivers).where(eq(schema.waivers.tourId, id)).run();
  db.delete(schema.expenses).where(eq(schema.expenses.tourId, id)).run();
  db.delete(schema.participants).where(eq(schema.participants.tourId, id)).run();
  db.delete(schema.tours).where(eq(schema.tours.id, id)).run();
}

export async function verifyTourAccessCode(tourId: number, code: string) {
  const db = getDb();
  const rows = db
    .select({ accessCode: schema.tours.accessCode })
    .from(schema.tours)
    .where(eq(schema.tours.id, tourId))
    .limit(1)
    .all();

  if (rows.length === 0) return false;
  return rows[0].accessCode === code;
}

// ── Participant operations ───────────────────────────
export async function addParticipant(data: {
  tourId: number;
  name: string;
  lastModifiedBy?: string;
}) {
  const db = getDb();
  const result = db.insert(schema.participants).values({
    tourId: data.tourId,
    name: data.name,
    lastModifiedBy: data.lastModifiedBy || "",
  }).run();
  return { id: Number(result.lastInsertRowid) };
}

export async function removeParticipant(id: number) {
  const db = getDb();
  db.delete(schema.participants).where(eq(schema.participants.id, id)).run();
}

// ── Expense operations ───────────────────────────────
export async function addExpense(data: {
  tourId: number;
  name: string;
  amount: number;
  paidBy: number;
  splitAmong: number[];
  splitType?: string;
  splitAmounts?: Record<string, number> | null;
  lastModifiedBy?: string;
}) {
  const db = getDb();
  const result = db.insert(schema.expenses).values({
    tourId: data.tourId,
    name: data.name,
    amount: data.amount,
    paidBy: data.paidBy,
    splitAmong: JSON.stringify(data.splitAmong),
    splitType: data.splitType || "equal",
    splitAmounts: data.splitAmounts
      ? JSON.stringify(data.splitAmounts)
      : null,
    lastModifiedBy: data.lastModifiedBy || "",
  }).run();
  return { id: Number(result.lastInsertRowid) };
}

export async function removeExpense(id: number) {
  const db = getDb();
  db.delete(schema.expenses).where(eq(schema.expenses.id, id)).run();
}

// ── Waiver operations ────────────────────────────────
export async function listWaiversByTour(tourId: number) {
  const db = getDb();
  const rows = db
    .select()
    .from(schema.waivers)
    .where(eq(schema.waivers.tourId, tourId))
    .orderBy(desc(schema.waivers.signedAt))
    .all();

  return rows.map((w) => ({
    ...w,
    personalInfo: JSON.parse(w.personalInfo || "{}"),
    healthChecklist: JSON.parse(w.healthChecklist || "[]"),
  }));
}

export async function createWaiver(data: {
  tourId: number;
  signerName: string;
  personalInfo: object;
  healthChecklist: boolean[];
  healthOther?: string;
  signatureImage: string;
}) {
  const db = getDb();
  const result = db.insert(schema.waivers).values({
    tourId: data.tourId,
    signerName: data.signerName,
    personalInfo: JSON.stringify(data.personalInfo),
    healthChecklist: JSON.stringify(data.healthChecklist),
    healthOther: data.healthOther || null,
    signatureImage: data.signatureImage,
  }).run();
  return { id: Number(result.lastInsertRowid) };
}

export async function deleteWaiver(id: number) {
  const db = getDb();
  db.delete(schema.waivers).where(eq(schema.waivers.id, id)).run();
}

// ── Cleanup ──────────────────────────────────────────
export async function closeDb() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
