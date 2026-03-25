import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Users ────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: text("provider_id").notNull().unique(),
  provider: text("provider").notNull(), // "google" | "kakao"
  name: text("name"),
  email: text("email"),
  profileImage: text("profile_image"),
  role: text("role").default("user"), // "user" | "admin"
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
  lastSignedIn: text("last_signed_in").default(sql`(datetime('now'))`),
});

// ── Tours ────────────────────────────────────────────
export const tours = sqliteTable("tours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").default(""),
  location: text("location").default(""),
  inviteCode: text("invite_code").notNull().unique(),
  accessCode: text("access_code").notNull().default("0000"),
  createdBy: text("created_by").default(""),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Participants ─────────────────────────────────────
export const participants = sqliteTable("participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tourId: integer("tour_id").notNull(),
  name: text("name").notNull(),
  lastModifiedBy: text("last_modified_by").default(""),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Expenses ─────────────────────────────────────────
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tourId: integer("tour_id").notNull(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // KRW
  paidBy: integer("paid_by").notNull(), // participant.id
  splitAmong: text("split_among").notNull(), // JSON: number[]
  splitType: text("split_type").default("equal"),
  splitAmounts: text("split_amounts"), // JSON: { [participantId]: amount }
  lastModifiedBy: text("last_modified_by").default(""),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Waivers (면책동의서) ─────────────────────────────
export const waivers = sqliteTable("waivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tourId: integer("tour_id").notNull(),
  signerName: text("signer_name").notNull(),
  personalInfo: text("personal_info").notNull(), // JSON
  healthChecklist: text("health_checklist").notNull(), // JSON
  healthOther: text("health_other"),
  signatureImage: text("signature_image").notNull(), // base64 SVG
  signedAt: text("signed_at").default(sql`(datetime('now'))`),
  agreed: integer("agreed", { mode: "boolean" }).default(true),
});
