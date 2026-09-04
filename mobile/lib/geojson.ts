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

export function doctorsToGeoJSON(
  doctors: Doctor[],
  selectedIds: Set<string>,
): FeatureCollection<Point, DoctorFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: doctors
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.longitude as number, d.latitude as number] },
        properties: {
          id: d.id,
          nom: `${d.nom}${d.prenom ? ' ' + d.prenom : ''}`,
          ciblage: d.ciblage,
          potentiel_score: d.potentiel_score ?? 0,
          mode_reception: d.mode_reception ?? '',
          selected: selectedIds.has(d.id),
        },
      })),
  };
}
