insert into public.mcp_tokens (user_id, name, token_hash, prefix)
select u.id, 'TEMP batch verify', '71fea397e09bdef521aa3976cfc79c1d93c506a1a023abcba90d6988745b3322', 'sas_TEMP_'
from auth.users u where u.email = 'gustavo.caetano@gmail.com' limit 1;