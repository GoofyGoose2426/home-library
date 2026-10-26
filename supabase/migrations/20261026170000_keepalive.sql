-- A daily ping keeps the free-plan database from pausing after a week of
-- no activity. It returns the time and reads nothing from any table.
create function public.keepalive() returns timestamptz
language sql stable security invoker set search_path = '' as $$
  select now();
$$;
revoke execute on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
