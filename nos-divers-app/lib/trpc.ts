import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
import { Platform } from "react-native";
import type { AppRouter } from "../server/routers";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  // If env var is set, use it
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  // Web: same origin
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:3000";
  }

  // Native: localhost
  return "http://localhost:3000";
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
    },
  },
});

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers: async () => {
          // For native: include auth token
          if (Platform.OS !== "web") {
            try {
              const { getToken } = await import("./auth");
              const token = await getToken();
              if (token) {
                return { Authorization: `Bearer ${token}` };
              }
            } catch {}
          }
          return {};
        },
      }),
    ],
  });
}
