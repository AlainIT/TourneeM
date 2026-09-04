export type Ciblage = 'P1' | 'P2' | 'P3' | 'HC';
export type ModeReception = 'LIBRE' | 'SUR_RDV' | 'ALEATOIRE' | 'NRP' | 'NPP' | 'INACTIF';
export type GeocodingStatus = 'pending' | 'ok' | 'failed' | 'partial';

export interface Doctor {
  id: string;
  sector_id: string;
  onekey: string;
  rpps: string | null;
  specialite: string | null;
  nom: string;
  prenom: string | null;
  lieu_exercice: string | null;
  etablissement: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  uga: string | null;
  secteur_code: string | null;
  region: string | null;
  pression_vm: number | null;
  mode_reception: ModeReception | null;
  ciblage: Ciblage;
  ciblage_precedent: Ciblage | null;
  action: string | null;
  rationnel: string | null;
  frequence_max: number | null;
  potentiel_score: number | null;
  latitude: number | null;
  longitude: number | null;
  geocoding_status: GeocodingStatus;
  geocoding_source: string | null;
  actif: boolean;
  last_import_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  doctor_id: string;
  sector_id: string;
  route_id: string | null;
  date_visite: string;
  note: string | null;
  created_at: string;
}

export type RouteStatut = 'brouillon' | 'en_cours' | 'terminee';
export type StopStatut = 'a_faire' | 'fait' | 'saute';

export interface DoctorRoute {
  id: string;
  sector_id: string;
  date: string;
  statut: RouteStatut;
  point_depart_lat: number | null;
  point_depart_lon: number | null;
  distance_totale_km: number | null;
  duree_totale_min: number | null;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  doctor_id: string;
  ordre: number;
  statut: StopStatut;
  visited_at: string | null;
}

export interface Sector {
  id: string;
  owner_id: string;
  nom: string;
  created_at: string;
}

export interface ImportRecord {
  id: string;
  sector_id: string;
  nom_fichier: string;
  date_import: string;
  nb_lignes_total: number;
  nb_crees: number;
  nb_maj: number;
  nb_retires: number;
  statut: 'en_cours' | 'termine' | 'erreur';
  erreur: string | null;
}

export const MODE_RECEPTION_LABEL: Record<ModeReception, string> = {
  LIBRE: 'Libre',
  SUR_RDV: 'Sur RDV',
  ALEATOIRE: 'Aléatoire',
  NRP: 'Ne reçoit pas',
  NPP: 'Non précisé',
  INACTIF: 'Inactif',
};

export const CIBLAGE_LABEL: Record<Ciblage, string> = {
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
  HC: 'Hors cible',
};
