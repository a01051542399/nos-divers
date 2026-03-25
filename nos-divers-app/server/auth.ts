import { Router, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import axios from "axios";
import { env } from "./env";
import { findOrCreateUser, getUserById } from "./db";
import { COOKIE_NAME, SESSION_MAX_AGE } from "../shared/const";

const router = Router();
const JWT_KEY = new TextEncoder().encode(env.JWT_SECRET);

// ── JWT helpers ──────────────────────────────────────
export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuedAt()
    .sign(JWT_KEY);
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY);
    return { userId: payload.userId as number };
  } catch {
    return null;
  }
}

// ── Extract user from request ────────────────────────
export async function extractUser(req: Request) {
  // 1. Check cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  // 2. Check Authorization header (for native app)
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const token = cookieToken || bearerToken;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return getUserById(payload.userId);
}

// ── Cookie helpers ───────────────────────────────────
function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE * 1000,
    path: "/",
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// ══════════════════════════════════════════════════════
// GOOGLE OAuth
// ══════════════════════════════════════════════════════

// Step 1: Redirect to Google
router.get("/oauth/google", (req: Request, res: Response) => {
  const redirectUri = `${env.BASE_URL}/api/oauth/google/callback`;
  const state = req.query.redirect as string || env.CLIENT_URL;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state: Buffer.from(state).toString("base64"),
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Google callback
router.get("/oauth/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const redirectUri = `${env.BASE_URL}/api/oauth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }
    );

    const { access_token } = tokenRes.data;

    // Get user info
    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const { id, name, email, picture } = userRes.data;

    const user = await findOrCreateUser({
      providerId: `google:${id}`,
      provider: "google",
      name: name || null,
      email: email || null,
      profileImage: picture || null,
    });

    const token = await createSessionToken(user.id);
    const clientRedirect = state
      ? Buffer.from(state as string, "base64").toString("utf-8")
      : env.CLIENT_URL;

    // For web: set cookie and redirect
    setSessionCookie(res, token);

    // Check if mobile redirect
    if (clientRedirect.startsWith(env.APP_SCHEME)) {
      res.redirect(`${clientRedirect}?token=${token}`);
    } else {
      res.redirect(clientRedirect);
    }
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.redirect(`${env.CLIENT_URL}?error=auth_failed`);
  }
});

// ══════════════════════════════════════════════════════
// KAKAO OAuth
// ══════════════════════════════════════════════════════

// Step 1: Redirect to Kakao
router.get("/oauth/kakao", (req: Request, res: Response) => {
  const redirectUri = `${env.BASE_URL}/api/oauth/kakao/callback`;
  const state = req.query.redirect as string || env.CLIENT_URL;

  const params = new URLSearchParams({
    client_id: env.KAKAO_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    state: Buffer.from(state).toString("base64"),
  });

  res.redirect(`https://kauth.kakao.com/oauth/authorize?${params}`);
});

// Step 2: Kakao callback
router.get("/oauth/kakao/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const redirectUri = `${env.BASE_URL}/api/oauth/kakao/callback`;

    // Exchange code for tokens
    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.KAKAO_CLIENT_ID,
        client_secret: env.KAKAO_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code: code as string,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = tokenRes.data;

    // Get user info
    const userRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const kakaoUser = userRes.data;
    const profile = kakaoUser.kakao_account?.profile;

    const user = await findOrCreateUser({
      providerId: `kakao:${kakaoUser.id}`,
      provider: "kakao",
      name: profile?.nickname || null,
      email: kakaoUser.kakao_account?.email || null,
      profileImage: profile?.profile_image_url || null,
    });

    const token = await createSessionToken(user.id);
    const clientRedirect = state
      ? Buffer.from(state as string, "base64").toString("utf-8")
      : env.CLIENT_URL;

    setSessionCookie(res, token);

    if (clientRedirect.startsWith(env.APP_SCHEME)) {
      res.redirect(`${clientRedirect}?token=${token}`);
    } else {
      res.redirect(clientRedirect);
    }
  } catch (error) {
    console.error("Kakao OAuth error:", error);
    res.redirect(`${env.CLIENT_URL}?error=auth_failed`);
  }
});

// ══════════════════════════════════════════════════════
// Common Auth Routes
// ══════════════════════════════════════════════════════

// Mobile: Exchange bearer token for cookie session
router.post("/auth/session", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = await verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  setSessionCookie(res, token);
  res.json({ ok: true });
});

// Get current user
router.get("/auth/me", async (req: Request, res: Response) => {
  const user = await extractUser(req);
  if (!user) {
    res.json({ user: null });
    return;
  }
  res.json({ user });
});

// Logout
router.post("/auth/logout", (req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export const authRouter = router;
