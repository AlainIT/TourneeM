-- TourneeM — schéma initial
-- Convention : tout est scopé par secteur (sector_id). En V1, un secteur = une utilisatrice.
-- La table sector_members existe dès la V1 (vide en usage réel) pour permettre en V2 un
-- accès manager multi-secteurs sans migration de schéma ni changement des politiques RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profils utilisateurs (1-1 avec auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  role text not null default 'delegue' check (role in ('delegue', 'manager')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Secteurs
-- ---------------------------------------------------------------------------
create table sectors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  created_at timestamptz not null default now()
);

-- Table de rattachement multi-utilisateurs (préparée pour la V2, non utilisée en V1
-- au-delà de l'entrée implicite du propriétaire).
create table sector_members (
  sector_id uuid not null references sectors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'delegue' check (role in ('delegue', 'manager')),
  created_at timestamptz not null default now(),
  primary key (sector_id, user_id)
);

create or replace function has_sector_access(target_sector_id uuid)
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
    where sm.sector_id = target_sector_id and sm.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Imports (historique des cycles de ciblage)
-- ---------------------------------------------------------------------------
create table imports (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors(id) on delete cascade,
  nom_fichier text not null,
  date_import timestamptz not null default now(),
  nb_lignes_total integer default 0,
  nb_crees integer default 0,
  nb_maj integer default 0,
  nb_retires integer default 0,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'termine', 'erreur')),
  erreur text
);

-- ---------------------------------------------------------------------------
-- Médecins (une ligne = un médecin ciblé, dernier import connu)
-- Colonnes alignées sur le fichier Excel réel (ex. CIBLAGE_S16.xlsx) plutôt
-- que sur des noms génériques, pour un mapping d'import direct et sans ambiguïté.
-- ---------------------------------------------------------------------------
create table doctors (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors(id) on delete cascade,

  onekey text not null,                    -- identifiant externe stable (colonne ONEKEY)
  rpps text,
  specialite text,
  nom text not null,
  prenom text,
  lieu_exercice text,                      -- "LIEU D'EXERCICE PRINCIPAL" (VILLE / MIXTE / ...)
  etablissement text,
  adresse text,
  ville text,
  code_postal text,
  uga text,                                -- code UGA source (granularité fine du secteur)
  secteur_code text,                       -- code secteur tel que fourni dans le fichier (ex. S16)
  region text,

  pression_vm integer,                     -- colonne PRESSION VM (brute)
  mode_reception text check (
    mode_reception in ('LIBRE', 'SUR_RDV', 'ALEATOIRE', 'NRP', 'NPP', 'INACTIF')
  ),
  ciblage text not null check (ciblage in ('P1', 'P2', 'P3', 'HC')),
  ciblage_precedent text check (ciblage_precedent in ('P1', 'P2', 'P3', 'HC')),
  action text,                             -- ex. "maintien segment cible" / "retrait ciblage"
  rationnel text,
  frequence_max integer,                   -- fréquence de visite max / 12 mois

  potentiel_score integer check (potentiel_score between 0 and 100),
  -- score 0-100 normalisé à l'import (percentile de PRESSION VM / poids produits
  -- sur l'ensemble du fichier), utilisé pour la taille des marqueurs sur la carte.

  latitude double precision,
  longitude double precision,
  geocoding_status text not null default 'pending' check (
    geocoding_status in ('pending', 'ok', 'failed', 'partial')
  ),
  geocoding_source text,                   -- 'api_adresse_gouv' | 'google'

  actif boolean not null default true,     -- false = retiré du ciblage (conservé pour historique)
  last_import_id uuid references imports(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (sector_id, onekey)
);

create index idx_doctors_sector on doctors (sector_id);
create index idx_doctors_actif on doctors (sector_id, actif);
create index idx_doctors_ciblage on doctors (sector_id, ciblage);
create index idx_doctors_geo on doctors (sector_id) where latitude is not null and longitude is not null;

-- Poids de prescription par produit (colonnes "POIDS UGA <PRODUIT>", dynamiques :
-- le fichier peut contenir plusieurs produits, une ligne par produit et par médecin).
create table doctor_product_weights (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  product_code text not null,              -- ex. 'STAT+EZE', 'ROSU+EZE'
  poids numeric not null,
  unique (doctor_id, product_code)
);

-- ---------------------------------------------------------------------------
-- Tournées
-- ---------------------------------------------------------------------------
create table routes (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors(id) on delete cascade,
  date date not null,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'en_cours', 'terminee')),
  point_depart_lat double precision,
  point_depart_lon double precision,
  distance_totale_km numeric,
  duree_totale_min integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_routes_sector_date on routes (sector_id, date);

create table route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete restrict,
  ordre integer not null,
  statut text not null default 'a_faire' check (statut in ('a_faire', 'fait', 'saute')),
  visited_at timestamptz,
  unique (route_id, doctor_id),
  unique (route_id, ordre)
);

create index idx_route_stops_route on route_stops (route_id);

-- ---------------------------------------------------------------------------
-- Visites
-- ---------------------------------------------------------------------------
create table visits (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  sector_id uuid not null references sectors(id) on delete cascade,
  route_id uuid references routes(id) on delete set null,
  date_visite timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index idx_visits_doctor on visits (doctor_id, date_visite desc);
create index idx_visits_sector on visits (sector_id, date_visite desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_doctors_updated_at before update on doctors
  for each row execute function set_updated_at();

create trigger trg_routes_updated_at before update on routes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table sectors enable row level security;
alter table sector_members enable row level security;
alter table imports enable row level security;
alter table doctors enable row level security;
alter table doctor_product_weights enable row level security;
alter table routes enable row level security;
alter table route_stops enable row level security;
alter table visits enable row level security;

create policy "profiles: self read/write" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "sectors: owner or member read" on sectors
  for select using (owner_id = auth.uid() or has_sector_access(id));
create policy "sectors: owner write" on sectors
  for insert with check (owner_id = auth.uid());
create policy "sectors: owner update/delete" on sectors
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "sectors: owner delete" on sectors
  for delete using (owner_id = auth.uid());

create policy "sector_members: member read" on sector_members
  for select using (user_id = auth.uid() or has_sector_access(sector_id));

create policy "imports: sector access" on imports
  for all using (has_sector_access(sector_id)) with check (has_sector_access(sector_id));

create policy "doctors: sector access" on doctors
  for all using (has_sector_access(sector_id)) with check (has_sector_access(sector_id));

create policy "doctor_product_weights: via doctor" on doctor_product_weights
  for all using (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_access(d.sector_id))
  ) with check (
    exists (select 1 from doctors d where d.id = doctor_id and has_sector_access(d.sector_id))
  );

create policy "routes: sector access" on routes
  for all using (has_sector_access(sector_id)) with check (has_sector_access(sector_id));

create policy "route_stops: via route" on route_stops
  for all using (
    exists (select 1 from routes r where r.id = route_id and has_sector_access(r.sector_id))
  ) with check (
    exists (select 1 from routes r where r.id = route_id and has_sector_access(r.sector_id))
  );

create policy "visits: sector access" on visits
  for all using (has_sector_access(sector_id)) with check (has_sector_access(sector_id));

-- ---------------------------------------------------------------------------
-- Bootstrap : à la création d'un compte, créer son profil + son secteur par défaut
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, nom) values (new.id, coalesce(new.raw_user_meta_data->>'nom', ''));
  insert into sectors (owner_id, nom) values (new.id, 'Mon secteur');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
