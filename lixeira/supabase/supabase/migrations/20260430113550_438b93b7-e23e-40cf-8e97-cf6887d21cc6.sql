-- touch_updated_at: fixar search_path
create or replace function public.touch_updated_at()
returns trigger language plpgsql
security invoker set search_path = public
as $$
begin new.updated_at = now(); return new; end; $$;

-- Revogar EXECUTE público das funções SECURITY DEFINER
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- handle_new_user é chamada apenas pelo trigger; não precisa GRANT.