import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Request, Response } from "express";
import { extractUser } from "./auth";
import type { AuthUser } from "../shared/types";

// ── Context ──────────────────────────────────────────
export interface Context {
  req: Request;
  res: Response;
  user: AuthUser | null;
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  const user = (await extractUser(req)) as AuthUser | null;
  return { req, res, user };
}

// ── tRPC init ────────────────────────────────────────
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// ── Protected procedure (requires login) ─────────────
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);

// ── Admin procedure ──────────────────────────────────
const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "관리자 권한이 필요합니다",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(isAdmin);
