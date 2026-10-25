import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadPublicReleaseLog, type PublicReleaseLog } from "./public-release-log";

export const getPublicReleaseLog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicReleaseLog> => {
    try {
      return await loadPublicReleaseLog(supabaseAdmin);
    } catch {
      return { available: false, releases: [] };
    }
  },
);
