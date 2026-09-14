import type { Ciblage, Doctor } from './types';
import type { UserLocation } from '../hooks/useUserLocation';
import { haversineKm } from './filters';
import { isOverdue, targetIntervalDays } from './reminders';

// Poids de base par priorité de ciblage — HC (hors-cible) n'est jamais
// suggéré : ce ciblage existe pour mémoire, pas pour occuper une tournée.
const CIBLAGE_WEIGHT: Record<Ciblage, number> = { P1: 100, P2: 60, P3: 30, HC: 0 };

function daysSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24);
}

export interface SuggestedDoctor {
  doctor: Doctor;
  score: number;
  reasons: string[];
}

// Combine ce qu'on sait déjà sur chaque médecin — priorité de ciblage, retard
// sur sa fréquence de visite cible, potentiel de prescription, proximité —
// en une seule suggestion de tournée, au lieu de laisser la déléguée tout
// sélectionner à la main à chaque fois.
export function suggestDailyRoute(
  doctors: Doctor[],
  lastVisitByDoctor: Record<string, string>,
  excludeIds: Set<string>,
  userLocation: UserLocation | null,
  limit: number,
): SuggestedDoctor[] {
  const candidates = doctors.filter(
    (d) =>
      d.actif &&
      d.ciblage !== 'HC' &&
      d.latitude != null &&
      d.longitude != null &&
      !excludeIds.has(d.id),
  );

  const scored: SuggestedDoctor[] = candidates.map((d) => {
    const reasons: string[] = [d.ciblage];
    let score = CIBLAGE_WEIGHT[d.ciblage];

    const lastVisit = lastVisitByDoctor[d.id];
    if (isOverdue(d, lastVisit)) {
      if (lastVisit) {
        const target = targetIntervalDays(d) ?? 0;
        const late = Math.round(daysSince(lastVisit) - target);
        score += 50 + Math.min(late, 60);
        reasons.push(`en retard de ${late}j`);
      } else {
        score += 90;
        reasons.push('jamais visité');
      }
    }

    if (d.potentiel_score != null) {
      score += d.potentiel_score * 0.3;
    }

    if (userLocation && d.latitude != null && d.longitude != null) {
      const distKm = haversineKm(userLocation, { lat: d.latitude, lon: d.longitude });
      score += Math.max(0, 40 - distKm);
      reasons.push(`à ${distKm < 1 ? Math.round(distKm * 1000) + ' m' : distKm.toFixed(1) + ' km'}`);
    }

    return { doctor: d, score, reasons };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
