import { createFileRoute } from "@tanstack/react-router";
import {
  PLATFORM_VERSION,
  PLATFORM_CODENAME,
  PLATFORM_STAGE,
  PLATFORM_BUILD_DATE,
  CHANGELOG,
} from "@/lib/version";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "public, max-age=60",
};

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const latest = CHANGELOG[0];
        return Response.json(
          {
            version: PLATFORM_VERSION,
            stage: PLATFORM_STAGE,
            codename: PLATFORM_CODENAME,
            build_date: PLATFORM_BUILD_DATE,
            label:
              PLATFORM_STAGE === "ga"
                ? `v${PLATFORM_VERSION} · ${PLATFORM_CODENAME}`
                : `v${PLATFORM_VERSION} · ${PLATFORM_STAGE} · ${PLATFORM_CODENAME}`,
            latest_release: latest
              ? {
                  version: latest.version,
                  date: latest.date,
                  kind: latest.kind,
                  title: latest.title,
                  highlights: latest.highlights,
                }
              : null,
          },
          { headers: CORS },
        );
      },
    },
  },
});
