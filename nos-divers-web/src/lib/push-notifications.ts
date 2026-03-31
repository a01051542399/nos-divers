import { PushNotifications } from "@capacitor/push-notifications";
import { isNative } from "./platform";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Initialize push notifications (native only).
 * Requests permission, registers the device token in Supabase.
 */
export async function initPushNotifications(userId: string) {
  if (!isNative() || !isSupabaseConfigured) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    // Save device token to Supabase
    await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        token: token.value,
        platform: getPlatformName(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push received:", notification);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Push action:", action);
  });
}

function getPlatformName(): string {
  const { Capacitor } = window as any;
  return Capacitor?.getPlatform?.() || "web";
}

/**
 * Remove device token on logout.
 */
export async function removePushToken(userId: string, token?: string) {
  if (!isNative() || !isSupabaseConfigured) return;
  if (token) {
    await supabase.from("device_tokens").delete().match({ user_id: userId, token });
  }
}
