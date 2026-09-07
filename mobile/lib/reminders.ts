import type { Ciblage, Doctor } from './types';

// Objectif de fréquence par défaut si le fichier de ciblage ne précise rien
// pour ce médecin (frequence_max) — en jours entre deux visites.
const DEFAULT_TARGET_DAYS: Record<Ciblage, number | null> = {
  P1: 30,
  P2: 45,
  P3: 90,
  HC: null, // hors-cible : pas de rappel automatique
};

function daysSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24);
}

// `frequence_max` (venant du fichier de ciblage) est un nombre de visites
// visées par an, pas un nombre de jours : on le convertit en intervalle cible.
export function targetIntervalDays(doctor: Doctor): number | null {
  if (doctor.frequence_max && doctor.frequence_max > 0) {
    return Math.round(365 / doctor.frequence_max);
  }
  return DEFAULT_TARGET_DAYS[doctor.ciblage];
}

export function isOverdue(doctor: Doctor, lastVisitIso: string | undefined): boolean {
  const target = targetIntervalDays(doctor);
  if (target == null) return false;
  if (!lastVisitIso) return true;
  return daysSince(lastVisitIso) > target;
}

export function listOverdueDoctors(doctors: Doctor[], lastVisitByDoctor: Record<string, string>): Doctor[] {
  return doctors.filter((d) => d.actif && isOverdue(d, lastVisitByDoctor[d.id]));
}
