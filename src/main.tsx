import React from "react";
import * as ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { onNotificationTap } from "./lib/native/notify";
import { initAnalytics } from "./lib/analytics";
import { initVisibilityTracking, notifyRouteChange } from "./lib/visibility";
import "./styles.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

// On native, tapping a local notification deep-links to its target screen.
onNotificationTap((url) => router.navigate({ to: url as string }));

// Keep the visibility tracker's notion of the current route fresh so
// tab_backgrounded / tab_foregrounded events carry the right pathname.
router.subscribe("onResolved", ({ toLocation }) => {
  notifyRouteChange(toLocation.pathname);
});

// Product analytics (no-op unless VITE_POSTHOG_KEY is set).
initAnalytics();
// Global tab-visibility events — fire regardless of whether PostHog has a key
// (track() itself no-ops until ready), so wiring is in place from first paint.
initVisibilityTracking();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
