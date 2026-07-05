// First-launch onboarding gate. A single localStorage flag, read synchronously
// so the router can redirect before the home screen paints. Fails "onboarded"
// if storage is blocked, so a user is never trapped in the intro.

const KEY = "mise-onboarded-v1";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function setOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore — worst case the intro shows again next launch */
  }
}
