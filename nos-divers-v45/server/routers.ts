import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== 투어 API (publicProcedure - 로그인 불필요) =====
  tour: router({
    list: publicProcedure.query(async () => {
      return db.getAllTours();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const tour = await db.getTourById(input.id);
        if (!tour) return null;
        const tourParticipants = await db.getParticipantsByTour(input.id);
        const tourExpenses = await db.getExpensesByTour(input.id);
        return {
          ...tour,
          participants: tourParticipants,
          expenses: tourExpenses.map((e) => ({
            ...e,
            splitAmong: JSON.parse(e.splitAmong) as number[],
            splitAmounts: e.splitAmounts ? JSON.parse(e.splitAmounts) as Record<string, number> : null,
          })),
        };
      }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          date: z.string().max(100).default(""),
          location: z.string().max(255).default(""),
          accessCode: z.string().length(4).regex(/^\d{4}$/, "4자리 숫자를 입력해주세요"),
          createdBy: z.string().min(1).max(255),
        })
      )
      .mutation(async ({ input }) => {
        return db.createTour(input);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTour(input.id);
        return { success: true };
      }),

    // 입장 코드 검증 (투어 상세 진입 시)
    verifyAccessCode: publicProcedure
      .input(z.object({ tourId: z.number(), accessCode: z.string() }))
      .mutation(async ({ input }) => {
        const tour = await db.getTourById(input.tourId);
        if (!tour) throw new Error("투어를 찾을 수 없습니다.");
        if (tour.accessCode !== input.accessCode) {
          return { success: false, message: "입장 코드가 올바르지 않습니다." };
        }
        return { success: true, message: "인증 성공" };
      }),

    // 초대 코드로 투어 조회 (기본 정보만 반환, accessCode 제외)
    getByInviteCode: publicProcedure
      .input(z.object({ inviteCode: z.string().min(1) }))
      .query(async ({ input }) => {
        const tour = await db.getTourByInviteCode(input.inviteCode.toUpperCase());
        if (!tour) return null;
        const tourParticipants = await db.getParticipantsByTour(tour.id);
        return {
          id: tour.id,
          name: tour.name,
          date: tour.date,
          location: tour.location,
          participants: tourParticipants,
        };
      }),

    // 초대 코드 + 입장 코드로 참여 (이름 입력 후 참여)
    joinByInviteCode: publicProcedure
      .input(
        z.object({
          inviteCode: z.string().min(1),
          accessCode: z.string().length(4),
          participantName: z.string().min(1).max(255),
        })
      )
      .mutation(async ({ input }) => {
        const tour = await db.getTourByInviteCode(input.inviteCode.toUpperCase());
        if (!tour) throw new Error("유효하지 않은 초대 코드입니다.");
        if (tour.accessCode !== input.accessCode) {
          throw new Error("입장 코드가 올바르지 않습니다.");
        }
        const participant = await db.addParticipant(tour.id, input.participantName, input.participantName);
        return { tourId: tour.id, tourName: tour.name, participant };
      }),
  }),

  // ===== 참여자 API =====
  participant: router({
    add: publicProcedure
      .input(z.object({
        tourId: z.number(),
        name: z.string().min(1).max(255),
        modifiedBy: z.string().max(255).default(""),
      }))
      .mutation(async ({ input }) => {
        return db.addParticipant(input.tourId, input.name, input.modifiedBy);
      }),

    remove: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeParticipant(input.id);
        return { success: true };
      }),
  }),

  // ===== 비용 API =====
  expense: router({
    add: publicProcedure
      .input(
        z.object({
          tourId: z.number(),
          name: z.string().min(1).max(255),
          amount: z.number().min(1),
          paidBy: z.number(),
          splitAmong: z.array(z.number()).min(1),
          splitType: z.enum(["equal", "custom"]).default("equal"),
          splitAmounts: z.record(z.string(), z.number()).optional(),
          lastModifiedBy: z.string().max(255).default(""),
        })
      )
      .mutation(async ({ input }) => {
        return db.addExpense(input);
      }),

    remove: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeExpense(input.id);
        return { success: true };
      }),
  }),

  // ===== 면책동의서 API =====
  waiver: router({
    listByTour: publicProcedure
      .input(z.object({ tourId: z.number() }))
      .query(async ({ input }) => {
        return db.getWaiversByTour(input.tourId);
      }),

    create: publicProcedure
      .input(
        z.object({
          tourId: z.number(),
          signerName: z.string().min(1),
          personalInfo: z.string(),
          healthChecklist: z.string(),
          healthOther: z.string().default(""),
          signatureImage: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createWaiver(input);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWaiver(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
