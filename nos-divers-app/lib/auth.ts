import { Platform } from "react-native";

const TOKEN_KEY = "nos_session_token";
const USER_KEY = "nos_user_info";

// ── Token Storage (platform-specific) ────────────────

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    // Web uses cookies, no need for token storage
    return null;
  }

  // Native: use SecureStore
  try {
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {}
}

// ── User Info Cache ──────────────────────────────────

export async function getCachedUser(): Promise<any | null> {
  try {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    }

    const SecureStore = await import("expo-secure-store");
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user: any): Promise<void> {
  try {
    const json = JSON.stringify(user);
    if (Platform.OS === "web") {
      localStorage.setItem(USER_KEY, json);
      return;
    }

    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(USER_KEY, json);
  } catch {}
}

// ── OAuth URL builders ───────────────────────────────

export function getGoogleAuthUrl(redirect?: string): string {
  const baseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/oauth/google`);
  if (redirect) url.searchParams.set("redirect", redirect);
  return url.toString();
}

export function getKakaoAuthUrl(redirect?: string): string {
  const baseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/oauth/kakao`);
  if (redirect) url.searchParams.set("redirect", redirect);
  return url.toString();
}
