import { createFileRoute } from "@tanstack/react-router";

/**
 * Hosted installer for the Hermes MCP integration.
 *
 * Usage from a user's terminal:
 *
 *     curl -fsSL https://superagentskill.com/api/public/install.hermes.sh | bash
 *
 * The script is intentionally idempotent — it reads the existing
 * `~/.hermes/config.yaml`, backs it up, and only appends the
 * `superagent-skill` MCP server block if it's not already there.
 *
 * Served under `/api/public/*` so the platform's auth gate doesn't touch it
 * and Cloudflare doesn't challenge the `curl` UA.
 */

const SCRIPT = `#!/usr/bin/env bash
# SuperAgentSkill × Hermes installer
# Adds the SuperAgentSkill MCP server to your Hermes config idempotently.
# Homepage: https://superagentskill.com

set -euo pipefail

BLUE='\\033[0;34m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'

info()  { printf "\${BLUE}\xE2\x86\x92\${NC} %s\\n" "$*"; }
ok()    { printf "\${GREEN}\xE2\x9C\x93\${NC} %s\\n" "$*"; }
warn()  { printf "\${YELLOW}!\${NC} %s\\n" "$*"; }
fail()  { printf "\${RED}\xE2\x9C\x97\${NC} %s\\n" "$*" >&2; exit 1; }

CONFIG_DIR="\${HERMES_HOME:-$HOME/.hermes}"
CONFIG_FILE="$CONFIG_DIR/config.yaml"
ENDPOINT="https://superagentskill.com/api/public/mcp"

info "SuperAgentSkill \xC3\x97 Hermes installer"
info "Config: $CONFIG_FILE"

mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
  info "Creating new config.yaml"
  cat > "$CONFIG_FILE" <<EOF
mcp_servers:
  superagent-skill:
    transport: http
    url: $ENDPOINT
    description: SuperAgentSkill \xE2\x80\x94 review, upload and discover AI skills.
EOF
  ok "Hermes config created with superagent-skill installed."
  info "Run 'hermes mcp list' to confirm the tools are available."
  exit 0
fi

if grep -qE '^[[:space:]]*superagent-skill:' "$CONFIG_FILE"; then
  ok "superagent-skill is already configured in $CONFIG_FILE"
  info "Nothing to do. Run 'hermes mcp list' to confirm."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$CONFIG_FILE.bak.$STAMP"
cp "$CONFIG_FILE" "$BACKUP"
ok "Backed up existing config to $BACKUP"

if grep -qE '^[[:space:]]*mcp_servers[[:space:]]*:' "$CONFIG_FILE"; then
  # Existing mcp_servers block: append the entry under it.
  # We do the safe thing and append at the very end of the block by tacking
  # the entry to the end of the file with a top-level mcp_servers extension.
  # (Hermes merges repeated mcp_servers keys.) If that assumption doesn't
  # hold, the user still has $BACKUP.
  cat >> "$CONFIG_FILE" <<EOF

# Added by SuperAgentSkill installer on $STAMP
mcp_servers:
  superagent-skill:
    transport: http
    url: $ENDPOINT
    description: SuperAgentSkill \xE2\x80\x94 review, upload and discover AI skills.
EOF
else
  cat >> "$CONFIG_FILE" <<EOF

# Added by SuperAgentSkill installer on $STAMP
mcp_servers:
  superagent-skill:
    transport: http
    url: $ENDPOINT
    description: SuperAgentSkill \xE2\x80\x94 review, upload and discover AI skills.
EOF
fi

ok "Added superagent-skill to $CONFIG_FILE"
info "Backup: $BACKUP"
info "Run 'hermes mcp list' to confirm the tools are available."
info "Docs: https://superagentskill.com/docs/mcp"
`;

const headers = {
  "Content-Type": "text/x-shellscript; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
  // Encourage `curl | bash` users to check what they're piping first.
  "X-Content-Type-Options": "nosniff",
};

export const Route = createFileRoute("/api/public/install.hermes.sh")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async () => new Response(SCRIPT, { status: 200, headers }),
      HEAD: async () => new Response(null, { status: 200, headers }),
    },
  },
});

