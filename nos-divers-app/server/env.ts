// ── Environment Variables ────────────────────────────

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:8081",

  // Database (SQLite - 파일 경로)
  DATABASE_PATH: process.env.DATABASE_PATH || "",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "nos-divers-dev-secret-change-me",

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // Kakao OAuth
  KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID || "",
  KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET || "",

  // Admin
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean),

  // App
  APP_SCHEME: "nosdivers",
} as const;

export function validateEnv() {
  console.log("🔧 Environment: " + (process.env.NODE_ENV || "development"));
}
