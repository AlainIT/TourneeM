import { supabase } from '../supabase';
import type { Doctor, DoctorRoute, RouteStop } from '../types';

export interface RouteStopWithDoctor extends RouteStop {
  doctor: Doctor;
}

export async function listRoutes(sectorId: string): Promise<DoctorRoute[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('sector_id', sectorId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRoute(routeId: string): Promise<DoctorRoute> {
  const { data, error } = await supabase.from('routes').select('*').eq('id', routeId).single();
  if (error) throw error;
  return data;
}

export async function getRouteStops(routeId: string): Promise<RouteStop[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .select('*')
    .eq('route_id', routeId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Crée une tournée brouillon pour la date donnée avec les médecins sélectionnés
// (ordre initial = ordre de sélection ; l'optimisation le recalculera ensuite).
export async function createRoute(params: {
  sectorId: string;
  date: string;
  doctorIds: string[];
}): Promise<DoctorRoute> {
  const { data: route, error: routeErr } = await supabase
    .from('routes')
    .insert({ sector_id: params.sectorId, date: params.date, statut: 'brouillon' })
    .select()
    .single();
  if (routeErr) throw routeErr;

  if (params.doctorIds.length) {
    const stops = params.doctorIds.map((doctor_id, i) => ({
      route_id: route.id,
      doctor_id,
      ordre: i + 1,
    }));
    const { error: stopsErr } = await supabase.from('route_stops').insert(stops);
    if (stopsErr) throw stopsErr;
  }

  return route;
}

export async function getRouteStopsWithDoctors(routeId: string): Promise<RouteStopWithDoctor[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .select('*, doctor:doctors(*)')
    .eq('route_id', routeId)
    .order('ordre', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RouteStopWithDoctor[];
}

export async function addStopToRoute(routeId: string, doctorId: string, ordre: number): Promise<void> {
  const { error } = await supabase.from('route_stops').insert({ route_id: routeId, doctor_id: doctorId, ordre });
  if (error) throw error;
}

export async function removeStopFromRoute(routeId: string, doctorId: string): Promise<void> {
  const { error } = await supabase
    .from('route_stops')
    .delete()
    .eq('route_id', routeId)
    .eq('doctor_id', doctorId);
  if (error) throw error;
}

export async function markStopVisited(stopId: string): Promise<void> {
  const { error } = await supabase
    .from('route_stops')
    .update({ statut: 'fait', visited_at: new Date().toISOString() })
    .eq('id', stopId);
  if (error) throw error;
}

export async function optimizeRoute(
  routeId: string,
  start: { lat: number; lon: number },
): Promise<{ ordre: string[]; distance_totale_km: number; duree_totale_min: number }> {
  const { data, error } = await supabase.functions.invoke('optimize-route', {
    body: { route_id: routeId, start },
  });
  if (error) throw error;
  return data;
}
