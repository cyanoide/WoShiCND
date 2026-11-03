-- Progression de 我是CND : une ligne par utilisateur, visible et modifiable
-- uniquement par son propriétaire. Appliqué sur le projet Supabase "Cyanocast"
-- (même comptes que les autres sites, connexion via la fonction admin-login).
create table public.woshicnd_progress (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.woshicnd_progress enable row level security;

create policy "chacun gere sa progression" on public.woshicnd_progress
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
