import { z } from "zod";
import {
  router,
  publicProcedure,
  protectedProcedure,
} from "./trpc";
import * as db from "./db";

// ══════════════════════════════════════════════════════
// Auth Router
// ══════════════════════════════════════════════════════
const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});

// ══════════════════════════════════════════════════════
// Tour Router
// ══════════════════════════════════════════════════════
const tourRouter = router({
  list: publicProcedure.query(async () => {
    return db.listTours();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getTourById(input.id);
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        date: z.string().default(""),
        location: z.string().default(""),
        accessCode: z.string().length(4).default("0000"),
        createdBy: z.string().default(""),
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

  verifyAccessCode: publicProcedure
    .input(
      z.object({
        tourId: z.number(),
        code: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const valid = await db.verifyTourAccessCode(input.tourId, input.code);
      return { valid };
    }),

  getByInviteCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return db.getTourByInviteCode(input.code);
    }),

  joinByInviteCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
        accessCode: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const tour = await db.getTourByInviteCode(input.code);
      if (!tour) {
        throw new Error("유효하지 않은 초대 코드입니다");
      }

      const valid = await db.verifyTourAccessCode(tour.id, input.accessCode);
      if (!valid) {
        throw new Error("접근 코드가 올바르지 않습니다");
      }

      const participant = await db.addParticipant({
        tourId: tour.id,
        name: input.name,
      });

      return { tourId: tour.id, participantId: participant.id };
    }),
});

// ══════════════════════════════════════════════════════
// Participant Router
// ══════════════════════════════════════════════════════
const participantRouter = router({
  add: publicProcedure
    .input(
      z.object({
        tourId: z.number(),
        name: z.string().min(1),
        lastModifiedBy: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.addParticipant(input);
    }),

  remove: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeParticipant(input.id);
      return { success: true };
    }),
});

// ══════════════════════════════════════════════════════
// Expense Router
// ══════════════════════════════════════════════════════
const expenseRouter = router({
  add: publicProcedure
    .input(
      z.object({
        tourId: z.number(),
        name: z.string().min(1),
        amount: z.number().positive(),
        paidBy: z.number(),
        splitAmong: z.array(z.number()).min(1),
        splitType: z.enum(["equal", "custom"]).default("equal"),
        splitAmounts: z.record(z.string(), z.number()).nullable().optional(),
        lastModifiedBy: z.string().optional(),
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
});

// ══════════════════════════════════════════════════════
// Waiver Router (면책동의서)
// ══════════════════════════════════════════════════════
const waiverRouter = router({
  listByTour: publicProcedure
    .input(z.object({ tourId: z.number() }))
    .query(async ({ input }) => {
      return db.listWaiversByTour(input.tourId);
    }),

  create: publicProcedure
    .input(
      z.object({
        tourId: z.number(),
        signerName: z.string().min(1),
        personalInfo: z.object({
          name: z.string(),
          birthDate: z.string(),
          phone: z.string(),
          divingLevel: z.string(),
          tourPeriod: z.string(),
          tourLocation: z.string(),
          emergencyContact: z.string(),
        }),
        healthChecklist: z.array(z.boolean()),
        healthOther: z.string().optional(),
        signatureImage: z.string().min(1),
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
});

// ══════════════════════════════════════════════════════
// App Router (Combined)
// ══════════════════════════════════════════════════════
export const appRouter = router({
  auth: authRouter,
  tour: tourRouter,
  participant: participantRouter,
  expense: expenseRouter,
  waiver: waiverRouter,
});

export type AppRouter = typeof appRouter;
