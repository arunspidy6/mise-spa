import React from "react";
import * as ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { onNotificationTap } from "./lib/native/notify";
import { initAnalytics, registerSuperProps } from "./lib/analytics";
import { resolveVariant } from "./lib/variant";
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

// Resolve the A/B variant before analytics so every event — including the
// first pageview — is tagged with app_variant. Reads ?v=, then sticky storage.
const appVariant = resolveVariant();
registerSuperProps({ app_variant: appVariant });

// Product analytics (no-op unless VITE_POSTHOG_KEY is set).
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
