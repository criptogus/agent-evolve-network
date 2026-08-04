import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  getConnectionStatus,
  type ConnectionStatus,
} from "@/lib/account/connection-status.functions";

const EMPTY: ConnectionStatus = {
  connected: false,
  tokenCount: 0,
  oauthClientCount: 0,
  clientNames: [],
  lastUsedAt: null,
  installCount: 0,
};

/** Shared connection state so the nav and the home dashboard never disagree. */
export function useConnectionStatus() {
  const { user } = useAuth();
  const fetchFn = useServerFn(getConnectionStatus);
  const query = useQuery({
    queryKey: ["connection-status", user?.id ?? "anon"],
    queryFn: async () => {
      try {
        return await fetchFn();
      } catch {
        return EMPTY;
      }
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });
  return {
    status: query.data ?? EMPTY,
    loading: !!user && query.isLoading,
    signedIn: !!user,
  };
}
