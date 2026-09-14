import type { FeatureCollection, Point } from 'geojson';
import type { Doctor } from './types';

export interface DoctorFeatureProps {
  id: string;
  nom: string;
  ciblage: string;
  potentiel_score: number;
  mode_reception: string;
  selected: boolean;
}

const EARTH_RADIUS_M = 6371000;
// Assez petit pour rester invisible au clustering (qui raisonne en pixels à
// chaque zoom) et sur la carte à zoom normal, assez grand pour que les points
// se distinguent une fois zoomé à fond.
const JITTER_RADIUS_M = 12;

// Plusieurs médecins d'un même cabinet de groupe partagent exactement la même
// adresse, donc les mêmes coordonnées géocodées. Le clustering ne peut alors
// jamais les séparer visuellement (des points parfaitement superposés restent
// superposés à n'importe quel zoom) : une bulle "3" éclatait en 3 marqueurs
// empilés au pixel près, donnant l'impression qu'il n'y en avait qu'un seul.
// On les écarte donc d'un petit cercle déterministe (basé sur l'id, stable
// entre les rendus) uniquement quand ils partagent exactement les mêmes
// coordonnées.
function jitterOffset(index: number, total: number, lat: number): { dLat: number; dLon: number } {
  if (total <= 1) return { dLat: 0, dLon: 0 };
  const angle = (2 * Math.PI * index) / total;
  const dLatM = JITTER_RADIUS_M * Math.cos(angle);
  const dLonM = JITTER_RADIUS_M * Math.sin(angle);
  const dLat = (dLatM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon = (dLonM / (EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  return { dLat, dLon };
}

export function doctorsToGeoJSON(
  doctors: Doctor[],
  selectedIds: Set<string>,
): FeatureCollection<Point, DoctorFeatureProps> {
  const geocoded = doctors.filter((d) => d.latitude != null && d.longitude != null);

  const groups = new Map<string, Doctor[]>();
  for (const d of geocoded) {
    const key = `${(d.latitude as number).toFixed(6)},${(d.longitude as number).toFixed(6)}`;
    const group = groups.get(key);
    if (group) group.push(d);
    else groups.set(key, [d]);
  }

  const positions = new Map<string, { lat: number; lon: number }>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      const d = group[0];
      positions.set(d.id, { lat: d.latitude as number, lon: d.longitude as number });
      continue;
    }
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((d, i) => {
      const lat = d.latitude as number;
      const lon = d.longitude as number;
      const { dLat, dLon } = jitterOffset(i, sorted.length, lat);
      positions.set(d.id, { lat: lat + dLat, lon: lon + dLon });
    });
  }

  return {
    type: 'FeatureCollection',
    features: geocoded.map((d) => {
      const pos = positions.get(d.id)!;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] },
        properties: {
          id: d.id,
          nom: `${d.nom}${d.prenom ? ' ' + d.prenom : ''}`,
          ciblage: d.ciblage,
          potentiel_score: d.potentiel_score ?? 0,
          mode_reception: d.mode_reception ?? '',
          selected: selectedIds.has(d.id),
        },
      };
    }),
  };
}
