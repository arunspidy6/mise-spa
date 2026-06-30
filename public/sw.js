// Mise timer service worker — schedules notifications when timers finish,
// even when the tab is hidden or the page is unloaded.

const scheduled = {}; // stepIdx → timeoutId
// Meal reminders are grouped by slot ("dinner@<cookAt>") so that several
// recipes saved for the same meal produce ONE summary notification, not one
// ping per recipe.
const slots = {}; // slotKey → { timeoutId, meal, cookAt, names: [] }

function fireSlot(key) {
  const slot = slots[key];
  if (!slot) return;
  const count = slot.names.length;
  if (count === 0) { delete slots[key]; return; }
  const title = count === 1 ? "Mise — Time to cook?" : `Mise — ${count} recipes for ${slot.meal}`;
  const body = count === 1
    ? `Time to cook ${slot.names[0]}? You saved it for ${slot.meal}.`
    : `You've got ${count} recipes saved to cook this ${slot.meal}. Open your cookbook to pick one.`;
  self.registration.showNotification(title, {
    body,
    icon: "/recipe-fallback.svg",
    badge: "/recipe-fallback.svg",
    tag: `mise-meal-${slot.meal}`,
    renotify: true,
    vibrate: [150, 80, 150, 80, 400],
    data: { url: "/history" },
  }).catch(() => {});
  delete slots[key];
}

self.addEventListener("message", (event) => {
  const { type, stepIdx, endsAt, label, name, meal, cookAt } = event.data ?? {};

  // Saved-recipe meal reminder — grouped by meal slot.
  if (type === "RECIPE_REMINDER") {
    const key = `${meal}@${cookAt}`;
    const slot = slots[key] || (slots[key] = { timeoutId: null, meal, cookAt, names: [] });
    if (!slot.names.includes(name)) slot.names.push(name);
    if (slot.timeoutId != null) clearTimeout(slot.timeoutId);
    const delay = cookAt - Date.now();
    if (delay <= 0) { fireSlot(key); return; }
    slot.timeoutId = setTimeout(() => fireSlot(key), delay);
    return;
  }

  if (type === "RECIPE_REMINDER_CANCEL") {
    // Remove this recipe from whichever slot holds it; drop empty slots.
    for (const key of Object.keys(slots)) {
      const slot = slots[key];
      const idx = slot.names.indexOf(name);
      if (idx > -1) slot.names.splice(idx, 1);
      if (slot.names.length === 0) {
        if (slot.timeoutId != null) clearTimeout(slot.timeoutId);
        delete slots[key];
      }
    }
    return;
  }

  if (type === "SCHEDULE") {
    // Clear any previous timeout for this step
    if (scheduled[stepIdx] != null) clearTimeout(scheduled[stepIdx]);

    const delay = endsAt - Date.now();
    if (delay <= 0) return; // already done

    scheduled[stepIdx] = setTimeout(async () => {
      delete scheduled[stepIdx];
      try {
        await self.registration.showNotification("Mise — Timer done!", {
          body: label ? `Step timer finished: ${label}` : "Your timer has finished.",
          icon: "/recipe-fallback.svg",
          badge: "/recipe-fallback.svg",
          tag: `mise-timer-${stepIdx}`,
          renotify: true,
          vibrate: [150, 80, 150, 80, 400],
        });
      } catch {}
    }, delay);
  }

  if (type === "CANCEL") {
    if (scheduled[stepIdx] != null) {
      clearTimeout(scheduled[stepIdx]);
      delete scheduled[stepIdx];
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Route an already-open window to the target before focusing it, so
      // clicking a reminder always lands on the cookbook — not whatever route
      // the app happened to be on.
      const client = list[0];
      if (client) {
        const navigated = "navigate" in client ? client.navigate(url) : Promise.resolve(client);
        return Promise.resolve(navigated).catch(() => client).then(c => (c || client).focus());
      }
      return clients.openWindow(url);
    })
  );
});
