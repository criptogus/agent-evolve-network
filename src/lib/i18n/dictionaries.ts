// The product is English-only. The `pt-BR` locale is intentionally aliased to
// `en` so any legacy stored preference still renders English copy.


export const en = {
  // /oauth/success
  oauth_success_eyebrow: "Authorization complete",
  oauth_success_connected_to_prefix: "Connected to ",
  oauth_success_returning: "Returning you to {client}…",
  oauth_success_close_tab: "You can close this tab and return to {client}. The connection is already live.",
  oauth_success_didnt_connect: "Didn't see your client connect?",
  oauth_success_loopback_explain:
    "The local listener may have closed before we delivered the code. Paste the code below into your CLI or client when prompted.",
  oauth_success_scheme_explain: "If {client} didn't open automatically, paste this code into the client when prompted.",
  oauth_success_copy: "Copy",
  oauth_success_copied: "Copied",
  oauth_success_retry_loopback: "Or retry sending to your local client →",
  oauth_success_open_in_client: "Open in {client} →",
  oauth_success_manage_at: "Manage this connection at",
  oauth_success_account_connections: "Account → Connections",
  oauth_success_mcp_docs: "MCP docs ↗",
  oauth_success_no_pending_title: "No pending connection",
  oauth_success_no_pending_body:
    "This page completes an MCP client authorization. Start the flow from your client (Claude, Cursor, Codex, Lovable, OpenClaw, Hermes, …) or run the CLI.",
  oauth_success_read_docs: "Read the MCP docs",

  // language switcher
  lang_switch_to_pt: "Português",
  lang_switch_to_en: "English",
};

export const ptBR: typeof en = {
  // /oauth/success
  oauth_success_eyebrow: "Autorização concluída",
  oauth_success_connected_to_prefix: "Conectado a ",
  oauth_success_returning: "Te enviando de volta para {client}…",
  oauth_success_close_tab:
    "Você já pode fechar esta aba e voltar para o {client}. A conexão está ativa.",
  oauth_success_didnt_connect: "Não viu seu cliente conectar?",
  oauth_success_loopback_explain:
    "O ouvinte local pode ter fechado antes de entregarmos o código. Cole o código abaixo no seu CLI ou cliente quando ele pedir.",
  oauth_success_scheme_explain:
    "Se o {client} não abriu sozinho, cole este código no cliente quando ele pedir.",
  oauth_success_copy: "Copiar",
  oauth_success_copied: "Copiado",
  oauth_success_retry_loopback: "Ou tentar reenviar para seu cliente local →",
  oauth_success_open_in_client: "Abrir no {client} →",
  oauth_success_manage_at: "Gerencie esta conexão em",
  oauth_success_account_connections: "Conta → Conexões",
  oauth_success_mcp_docs: "Docs do MCP ↗",
  oauth_success_no_pending_title: "Nenhuma conexão pendente",
  oauth_success_no_pending_body:
    "Esta página completa a autorização de um cliente MCP. Inicie o fluxo a partir do seu cliente (Claude, Cursor, Codex, Lovable, OpenClaw, Hermes, …) ou rode o CLI.",
  oauth_success_read_docs: "Ler a documentação do MCP",

  lang_switch_to_pt: "Português",
  lang_switch_to_en: "English",
};

export type TKey = keyof typeof en;
export type Lang = "en" | "pt-BR";

export const dictionaries: Record<Lang, typeof en> = {
  en,
  "pt-BR": ptBR,
};
