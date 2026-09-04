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
export async function listLastVisitPerDoctor(sectorId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('visits')
    .select('doctor_id, date_visite')
    .eq('sector_id', sectorId)
    .order('date_visite', { ascending: false });
  if (error) throw error;

  const map = new Map<string, string>();
  for (const v of data ?? []) {
    if (!map.has(v.doctor_id)) map.set(v.doctor_id, v.date_visite);
  }
  return map;
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
