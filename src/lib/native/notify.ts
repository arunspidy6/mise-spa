// Unified notification layer.
//
// On native (iOS via Capacitor) this uses OS-scheduled Local Notifications —
// they fire even when the app is closed, which is the robust replacement for
// the web Service Worker timers (those don't run in a WKWebView). On the web it
// falls back to the Notification API. Adopt this single API across the app
// (cook timers + meal reminders) so the iOS port is a config change, not a
// rewrite.

import { Capacitor } from "@capacitor/core";

export type LocalNotice = {
  id: number;            // stable numeric id (so it can be cancelled/updated)
  title: string;
  body: string;
  at: number;            // epoch ms to fire
  url?: string;          // route to open on tap (handled by the app's deep-link)
};

export function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

// Track web timers so they can be cancelled (native uses the OS scheduler).
const webTimers = new Map<number, ReturnType<typeof setTimeout>>();

export async function scheduleNotice(n: LocalNotice): Promise<boolean> {
  const delay = n.at - Date.now();
  if (delay <= 0) return false;

  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: new Date(n.at), allowWhileIdle: true },
        extra: { url: n.url ?? "/" },
      }],
    });
    return true;
  }

  // Web fallback — fires only while a tab is alive. The production web build
  // should additionally delegate long-range reminders to the Service Worker.
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  if (webTimers.has(n.id)) clearTimeout(webTimers.get(n.id)!);
  webTimers.set(n.id, setTimeout(() => {
    webTimers.delete(n.id);
    try { new Notification(n.title, { body: n.body, tag: `mise-${n.id}` }); } catch { /* ignore */ }
  }, delay));
  return true;
}

export async function cancelNotice(id: number): Promise<void> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
    return;
  }
  if (webTimers.has(id)) { clearTimeout(webTimers.get(id)!); webTimers.delete(id); }
}

// Register a handler for when the user taps a native notification — used to
// deep-link to the relevant screen (the notification's `extra.url`).
export async function onNotificationTap(handler: (url: string) => void): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.addListener("localNotificationActionPerformed", (event: any) => {
      const url = event?.notification?.extra?.url;
      if (typeof url === "string") handler(url);
    });
  } catch { /* plugin unavailable */ }
}

// Stable numeric id from a recipe name (LocalNotifications ids must be ints).
export function noticeIdFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000;
}
