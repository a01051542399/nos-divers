import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./trpc";
import { authRouter } from "./auth";
import { env, validateEnv } from "./env";

validateEnv();

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // In production, you'd want to whitelist specific origins
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

// ── Health check ─────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── OAuth routes ─────────────────────────────────────
app.use("/api", authRouter);

// ── tRPC routes ──────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req, res }),
  })
);

// ── Start server ─────────────────────────────────────
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       🤿 NoS Divers API Server          ║
║──────────────────────────────────────────║
║  Port:     ${String(PORT).padEnd(29)}║
║  Env:      ${env.NODE_ENV.padEnd(29)}║
║  Health:   /api/health                   ║
║  tRPC:     /api/trpc                     ║
║  Auth:     /api/oauth/google             ║
║           /api/oauth/kakao               ║
╚══════════════════════════════════════════╝
  `);
});

export default app;
