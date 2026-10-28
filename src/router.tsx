import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = async () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (import.meta.env.SSR) {
    const { requestCspNonce } = await import("./lib/csp-context.server");
    router.options.ssr = { ...router.options.ssr, nonce: requestCspNonce() };
  } else {
    router.options.ssr = {
      ...router.options.ssr,
      nonce: document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce,
    };
  }
  return router;
};
