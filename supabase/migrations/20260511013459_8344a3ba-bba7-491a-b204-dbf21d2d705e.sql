
alter table public.package_versions
  add column if not exists mcp_servers jsonb not null default '[]'::jsonb,
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists live_resources jsonb not null default '[]'::jsonb;

comment on column public.package_versions.mcp_servers is
  'Optional list of MCP server dependencies. Each item: { name, transport: "http"|"stdio"|"sse", url?, command?, args?, env?: string[], scopes?: string[], required?: boolean, description? }';
comment on column public.package_versions.permissions is
  'Optional list of required agent capabilities/scopes. Each item: { scope, reason?, required?: boolean }';
comment on column public.package_versions.live_resources is
  'Optional list of MCP/runtime resources read at execution time. Each item: { uri, kind?: "mcp"|"http"|"db", purpose?, refresh?: "on_call"|"cached", required?: boolean }';
