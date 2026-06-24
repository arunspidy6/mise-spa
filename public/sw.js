// Mise timer service worker — schedules notifications when timers finish,
// even when the tab is hidden or the page is unloaded.

const scheduled = {}; // stepIdx → timeoutId

self.addEventListener("message", (event) => {
  const { type, stepIdx, endsAt, label } = event.data ?? {};

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
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow("/");
    })
  );
});
