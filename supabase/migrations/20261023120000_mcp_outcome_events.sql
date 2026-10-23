BEGIN;
ALTER TABLE public.mcp_funnel_events DROP CONSTRAINT mcp_funnel_events_event_known;
ALTER TABLE public.mcp_funnel_events ADD CONSTRAINT mcp_funnel_events_event_known CHECK (event = ANY (ARRAY[
'connect_viewed','oauth_authorize_viewed','oauth_authorize_approved','oauth_authorize_denied',
'oauth_success_shown','oauth_loopback_attempted','oauth_manual_code_copied','oauth_scheme_triggered',
'mcp_first_call','mcp_first_write','install_button_clicked','pat_minted','hero_viewed','cta_clicked',
'signup_viewed','signup_started','signup_completed','signup_failed','referral_click',
'mcp_call_attempted','mcp_call_succeeded','mcp_call_failed','mcp_call_unknown'
]::text[]));
COMMIT;
