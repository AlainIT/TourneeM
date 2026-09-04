import type { Ciblage, Doctor, ModeReception } from './types';
import type { UserLocation } from '../hooks/useUserLocation';

export type VisitStatusFilter = 'all' | 'never' | 'visited' | 'stale';

export interface DoctorFilters {
  ciblage: Ciblage[];
  modeReception: ModeReception[];
  specialite: string[];
  visitStatus: VisitStatusFilter;
  staleDays: number; // utilisé si visitStatus === 'stale'
  search: string;
}

export const DEFAULT_FILTERS: DoctorFilters = {
  ciblage: [],
  modeReception: [],
  specialite: [],
  visitStatus: 'all',
  staleDays: 60,
  search: '',
};

export type SortMode = 'nom' | 'potentiel' | 'proximite';

function daysSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24);
}

export function haversineKm(a: UserLocation, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function applyFilters(
  doctors: Doctor[],
  filters: DoctorFilters,
  lastVisitByDoctor: Map<string, string>,
): Doctor[] {
  const search = filters.search.trim().toLowerCase();

  return doctors.filter((d) => {
    if (!d.actif) return false;
    if (filters.ciblage.length && !filters.ciblage.includes(d.ciblage)) return false;
    if (filters.modeReception.length && (!d.mode_reception || !filters.modeReception.includes(d.mode_reception))) {
      return false;
    }
    if (filters.specialite.length && (!d.specialite || !filters.specialite.includes(d.specialite))) return false;

    if (filters.visitStatus !== 'all') {
      const lastVisit = lastVisitByDoctor.get(d.id);
      if (filters.visitStatus === 'never' && lastVisit) return false;
      if (filters.visitStatus === 'visited' && !lastVisit) return false;
      if (filters.visitStatus === 'stale') {
        if (lastVisit && daysSince(lastVisit) < filters.staleDays) return false;
      }
    }

    if (search) {
      const haystack = `${d.nom} ${d.prenom ?? ''} ${d.ville ?? ''} ${d.etablissement ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

export function sortDoctors(doctors: Doctor[], sortMode: SortMode, userLocation: UserLocation | null): Doctor[] {
  const copy = [...doctors];
  if (sortMode === 'potentiel') {
    return copy.sort((a, b) => (b.potentiel_score ?? -1) - (a.potentiel_score ?? -1));
  }
  if (sortMode === 'proximite' && userLocation) {
    return copy.sort((a, b) => {
      const da = a.latitude != null && a.longitude != null
        ? haversineKm(userLocation, { lat: a.latitude, lon: a.longitude })
        : Infinity;
      const db = b.latitude != null && b.longitude != null
        ? haversineKm(userLocation, { lat: b.latitude, lon: b.longitude })
        : Infinity;
      return da - db;
    });
  }
  return copy.sort((a, b) => a.nom.localeCompare(b.nom));
}

export function distinctSpecialites(doctors: Doctor[]): string[] {
  return Array.from(new Set(doctors.map((d) => d.specialite).filter((s): s is string => !!s))).sort();
}
