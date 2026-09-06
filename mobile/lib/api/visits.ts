import { supabase } from '../supabase';
import type { Visit } from '../types';

export async function markVisited(params: {
  doctorId: string;
  sectorId: string;
  routeId?: string;
  note?: string;
}): Promise<Visit> {
  const { data, error } = await supabase
    .from('visits')
    .insert({
      doctor_id: params.doctorId,
      sector_id: params.sectorId,
      route_id: params.routeId ?? null,
      note: params.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listVisitsForDoctor(doctorId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('date_visite', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Dernière visite par médecin, pour un secteur — sert au statut de visite
// (jamais visité / non vu depuis X jours) sans charger tout l'historique.
//
// Un objet simple (et non un Map) : le cache React Query est persisté sur
// l'appareil (AsyncStorage, pour la consultation hors-ligne) via
// JSON.stringify/parse, qui ne sait pas sérialiser un Map — il redevient un
// objet `{}` sans méthodes au redémarrage de l'app, ce qui faisait planter
// l'app au premier rendu de l'écran carte après une persistance.
export async function listLastVisitPerDoctor(sectorId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('visits')
    .select('doctor_id, date_visite')
    .eq('sector_id', sectorId)
    .order('date_visite', { ascending: false });
  if (error) throw error;

  const result: Record<string, string> = {};
  for (const v of data ?? []) {
    if (!(v.doctor_id in result)) result[v.doctor_id] = v.date_visite;
  }
  return result;
}

export async function listVisitsInPeriod(sectorId: string, from: string, to: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('sector_id', sectorId)
    .gte('date_visite', from)
    .lte('date_visite', to)
    .order('date_visite', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
