// Meal-time reminders for saved recipes.
//
// When a recipe is saved we pick the next lunch or dinner slot and ask the
// service worker to fire a notification then ("Time to cook X?"). Lunch vs
// dinner is chosen from the recipe itself — quick, light dishes lean lunch,
// heartier ones lean dinner — and we always roll forward to the next slot
// that hasn't passed yet.

import type { Recipe } from "@/store/mise";
import { isNative, ensureNotificationPermission, scheduleNotice, cancelNotice, noticeIdFor } from "@/lib/native/notify";

const LUNCH_HOUR = 12;
const DINNER_HOUR = 18;

export type MealSlot = { meal: "lunch" | "dinner"; cookAt: number };

// Build a timestamp for a given hour, today or `dayOffset` days ahead,
// relative to `base` so a simulated/injected clock stays consistent.
function atHour(hour: number, dayOffset = 0, base = Date.now()): number {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

// Decide which meal a recipe suits: a fast, light dish is a lunch candidate,
// anything longer is treated as dinner.
function preferredMeal(recipe: Recipe): "lunch" | "dinner" {
  return recipe.time_minutes <= 25 ? "lunch" : "dinner";
}

// The next upcoming lunch/dinner slot for this recipe. If the preferred meal
// has already passed today, fall back to the other meal still ahead today,
// otherwise tomorrow's preferred meal.
export function pickMealSlot(recipe: Recipe, now = Date.now()): MealSlot {
  const wants = preferredMeal(recipe);
  const todayLunch = atHour(LUNCH_HOUR, 0, now);
  const todayDinner = atHour(DINNER_HOUR, 0, now);

  if (wants === "lunch") {
    if (now < todayLunch) return { meal: "lunch", cookAt: todayLunch };
    if (now < todayDinner) return { meal: "dinner", cookAt: todayDinner };
    return { meal: "lunch", cookAt: atHour(LUNCH_HOUR, 1, now) };
  }
  // wants dinner
  if (now < todayDinner) return { meal: "dinner", cookAt: todayDinner };
  return { meal: "dinner", cookAt: atHour(DINNER_HOUR, 1, now) };
}

// Make sure the timer/reminder service worker is registered before we post to it.
async function ready(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export type ScheduleResult = { ok: boolean; reason?: "denied" | "no-sw" };

// Returns whether a reminder was actually scheduled, so callers can avoid
// promising a reminder that will never fire (permission blocked / no worker).
export async function scheduleRecipeReminder(
  name: string,
  meal: "lunch" | "dinner",
  cookAt: number,
): Promise<ScheduleResult> {
  // Native (iOS): OS-scheduled local notification — fires even when the app is
  // closed. This is the robust path for a shipped app.
  if (isNative()) {
    const granted = await ensureNotificationPermission();
    if (!granted) return { ok: false, reason: "denied" };
    await scheduleNotice({
      id: noticeIdFor(name),
      title: "Mise — Time to cook?",
      body: `Time to cook ${name}? You saved it for ${meal}.`,
      at: cookAt,
      url: "/history",
    });
    return { ok: true };
  }

  // Web: schedule via the service worker.
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch { /* permission prompt unavailable */ }

  const reg = await ready();
  if (!reg?.active) return { ok: false, reason: "no-sw" };

  reg.active.postMessage({ type: "RECIPE_REMINDER", name, meal, cookAt });

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return { ok: false, reason: "denied" };
  }
  return { ok: true };
}

export async function cancelRecipeReminder(name: string) {
  if (isNative()) { await cancelNotice(noticeIdFor(name)); return; }
  const reg = await ready();
  reg?.active?.postMessage({ type: "RECIPE_REMINDER_CANCEL", name });
}

// "around lunch" / "tomorrow around dinner" — friendly phrasing for the toast.
export function describeSlot(slot: MealSlot, now = Date.now()): string {
  const isToday = new Date(slot.cookAt).getDate() === new Date(now).getDate();
  return `${isToday ? "" : "tomorrow "}around ${slot.meal}`;
}
