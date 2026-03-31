import { boolean, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 다이빙 투어 테이블
 */
export const tours = mysqlTable("tours", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  date: varchar("date", { length: 100 }).notNull().default(""),
  location: varchar("location", { length: 255 }).notNull().default(""),
  /** 초대 코드 (8자리 고유 코드 - 기존 호환) */
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
  /** 입장 코드 (4자리 숫자, 주최자가 설정) */
  accessCode: varchar("accessCode", { length: 4 }).notNull().default("0000"),
  /** 투어 생성자 이름 */
  createdBy: varchar("createdBy", { length: 255 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tour = typeof tours.$inferSelect;
export type InsertTour = typeof tours.$inferInsert;

/**
 * 투어 참여자 테이블
 */
export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  tourId: int("tourId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** 마지막 수정자 이름 */
  lastModifiedBy: varchar("lastModifiedBy", { length: 255 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

/**
 * 비용 항목 테이블
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  tourId: int("tourId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: int("amount").notNull(),
  /** 결제자 participant id */
  paidBy: int("paidBy").notNull(),
  /** 분담자 목록 (JSON 배열: [participantId, ...]) */
  splitAmong: text("splitAmong").notNull(),
  /** 정산 방식: equal(균등분배) / custom(커스텀 금액) */
  splitType: varchar("splitType", { length: 20 }).notNull().default("equal"),
  /** 커스텀 금액 (JSON: {participantId: amount, ...}), splitType이 custom일 때 사용 */
  splitAmounts: text("splitAmounts"),
  /** 마지막 수정자 이름 */
  lastModifiedBy: varchar("lastModifiedBy", { length: 255 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * 면책동의서 테이블
 */
export const waivers = mysqlTable("waivers", {
  id: int("id").autoincrement().primaryKey(),
  tourId: int("tourId").notNull(),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  /** 기본 정보 JSON */
  personalInfo: text("personalInfo").notNull(),
  /** 건강 체크리스트 JSON boolean[] */
  healthChecklist: text("healthChecklist").notNull(),
  healthOther: text("healthOther"),
  /** 서명 이미지 base64 (mediumtext for large SVG data) */
  signatureImage: mediumtext("signatureImage").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  agreed: boolean("agreed").notNull().default(true),
});

export type WaiverRecord = typeof waivers.$inferSelect;
export type InsertWaiver = typeof waivers.$inferInsert;
