-- Vue manager : un utilisateur peut être invité en lecture seule sur le
-- secteur d'une déléguée (sector_members.role = 'manager', déjà prévu dans le
-- schéma initial mais jamais exploité). Jusqu'ici, `has_sector_access`
-- accordait un accès complet (lecture ET écriture) à tout membre d'un
-- secteur, quel que soit son rôle — un manager pourrait donc modifier les
-- tournées de sa déléguée, ce qu'on ne veut pas. On sépare : la lecture reste
-- ouverte à tout membre (has_sector_access), l'écriture est restreinte au
-- propriétaire et aux membres 'delegue' (has_sector_write_access).

create or replace function has_sector_write_access(target_sector_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from sectors s
    where s.id = target_sector_id and s.owner_id = auth.uid()
  ) or exists (
    select 1 from sector_members sm
    where sm.sector_id = target_sector_id and sm.user_id = auth.uid() and sm.role = 'delegue'
  );
$$;

-- ---------------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------------
drop policy if exists "doctors: sector access" on doctors;
create policy "doctors: sector read" on doctors
  for select using (has_sector_access(sector_id));
create policy "doctors: sector insert" on doctors
  for insert with check (has_sector_write_access(sector_id));
create policy "doctors: sector update" on doctors
  for update using (has_sector_write_access(sector_id)) with check (has_sector_write_access(sector_id));
create policy "doctors: sector delete" on doctors
  for delete using (has_sector_write_access(sector_id));

-- ---------------------------------------------------------------------------
-- doctor_product_weights (via doctor)
-- ---------------------------------------------------------------------------
drop policy if exists "doctor_product_weights: via doctor" on doctor_product_weights;
create policy "doctor_product_weights: read" on doctor_product_weights
  for select using (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_access(d.sector_id))
  );
create policy "doctor_product_weights: insert" on doctor_product_weights
  for insert with check (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_write_access(d.sector_id))
  );
create policy "doctor_product_weights: update" on doctor_product_weights
  for update using (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_write_access(d.sector_id))
  ) with check (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_write_access(d.sector_id))
  );
create policy "doctor_product_weights: delete" on doctor_product_weights
  for delete using (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_write_access(d.sector_id))
  );

-- ---------------------------------------------------------------------------
-- routes
-- ---------------------------------------------------------------------------
drop policy if exists "routes: sector access" on routes;
create policy "routes: sector read" on routes
  for select using (has_sector_access(sector_id));
create policy "routes: sector insert" on routes
  for insert with check (has_sector_write_access(sector_id));
create policy "routes: sector update" on routes
  for update using (has_sector_write_access(sector_id)) with check (has_sector_write_access(sector_id));
create policy "routes: sector delete" on routes
  for delete using (has_sector_write_access(sector_id));

-- ---------------------------------------------------------------------------
-- route_stops (via route)
-- ---------------------------------------------------------------------------
drop policy if exists "route_stops: via route" on route_stops;
create policy "route_stops: read" on route_stops
  for select using (
    exists (select 1 from routes r where r.id = route_id and has_sector_access(r.sector_id))
  );
create policy "route_stops: insert" on route_stops
  for insert with check (
    exists (select 1 from routes r where r.id = route_id and has_sector_write_access(r.sector_id))
  );
create policy "route_stops: update" on route_stops
  for update using (
    exists (select 1 from routes r where r.id = route_id and has_sector_write_access(r.sector_id))
  ) with check (
    exists (select 1 from routes r where r.id = route_id and has_sector_write_access(r.sector_id))
  );
create policy "route_stops: delete" on route_stops
  for delete using (
    exists (select 1 from routes r where r.id = route_id and has_sector_write_access(r.sector_id))
  );

-- ---------------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------------
drop policy if exists "visits: sector access" on visits;
create policy "visits: sector read" on visits
  for select using (has_sector_access(sector_id));
create policy "visits: sector insert" on visits
  for insert with check (has_sector_write_access(sector_id));
create policy "visits: sector update" on visits
  for update using (has_sector_write_access(sector_id)) with check (has_sector_write_access(sector_id));
create policy "visits: sector delete" on visits
  for delete using (has_sector_write_access(sector_id));

-- ---------------------------------------------------------------------------
-- imports
-- ---------------------------------------------------------------------------
drop policy if exists "imports: sector access" on imports;
create policy "imports: sector read" on imports
  for select using (has_sector_access(sector_id));
create policy "imports: sector insert" on imports
  for insert with check (has_sector_write_access(sector_id));
create policy "imports: sector update" on imports
  for update using (has_sector_write_access(sector_id)) with check (has_sector_write_access(sector_id));
create policy "imports: sector delete" on imports
  for delete using (has_sector_write_access(sector_id));

-- ---------------------------------------------------------------------------
-- Invitation d'un manager par e-mail
-- ---------------------------------------------------------------------------
-- Le client (clé anon/authenticated) ne peut pas lire auth.users ni écrire
-- dans sector_members (aucune policy insert/update dessus). Ces fonctions
-- SECURITY DEFINER, exécutées avec les droits du propriétaire des tables
-- (postgres), font le pont de façon contrôlée : elles vérifient elles-mêmes
-- que l'appelant est bien propriétaire du secteur avant d'agir.

create or replace function invite_manager_by_email(target_sector_id uuid, manager_email text)
returns void
language plpgsql
security definer
as $$
declare
  v_manager_id uuid;
begin
  if not exists (select 1 from sectors where id = target_sector_id and owner_id = auth.uid()) then
    raise exception 'Seule la propriétaire du secteur peut inviter un manager.';
  end if;

  select id into v_manager_id from auth.users where lower(email) = lower(manager_email);
  if v_manager_id is null then
    raise exception 'Aucun compte TourneeM trouvé avec cet e-mail. Le manager doit d''abord créer un compte.';
  end if;
  if v_manager_id = auth.uid() then
    raise exception 'Vous ne pouvez pas vous inviter vous-même comme manager de votre propre secteur.';
  end if;

  insert into sector_members (sector_id, user_id, role)
  values (target_sector_id, v_manager_id, 'manager')
  on conflict (sector_id, user_id) do update set role = 'manager';
end;
$$;

create or replace function revoke_sector_member(target_sector_id uuid, member_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from sectors where id = target_sector_id and owner_id = auth.uid()) then
    raise exception 'Seule la propriétaire du secteur peut retirer un accès.';
  end if;
  delete from sector_members where sector_id = target_sector_id and user_id = member_user_id;
end;
$$;

-- Liste des managers invités sur un secteur (avec leur e-mail) — la table
-- profiles ne stocke pas l'e-mail et n'est de toute façon lisible que par son
-- propriétaire (RLS "self read/write"), d'où le passage par une fonction
-- dédiée plutôt qu'une jointure côté client.
create or replace function list_sector_managers(target_sector_id uuid)
returns table (user_id uuid, email text)
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from sectors where id = target_sector_id and owner_id = auth.uid()) then
    raise exception 'Seule la propriétaire du secteur peut voir ses managers.';
  end if;
  return query
    select sm.user_id, u.email::text
    from sector_members sm
    join auth.users u on u.id = sm.user_id
    where sm.sector_id = target_sector_id and sm.role = 'manager';
end;
$$;
