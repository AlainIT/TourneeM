import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStopToRoute,
  getDraftRouteForDate,
  getOrCreateDraftRouteForDate,
  getRouteStops,
  removeStopFromRoute,
} from '../lib/api/routes';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// La tournée "en cours de constitution" du jour : ajouter un médecin depuis la
// carte/liste crée (au premier ajout) ou complète directement cette tournée
// en base, sans étape de confirmation séparée — l'onglet Tournées la reflète
// donc immédiatement.
export function useTodayRoute(sectorId: string | undefined) {
  const date = todayIso();
  const queryClient = useQueryClient();

  const routeQuery = useQuery({
    queryKey: ['route', 'today-draft', sectorId, date],
    queryFn: () => getDraftRouteForDate(sectorId!, date),
    enabled: !!sectorId,
  });
  const route = routeQuery.data ?? null;

  const stopsQuery = useQuery({
    queryKey: ['route-stops', route?.id],
    queryFn: () => getRouteStops(route!.id),
    enabled: !!route,
  });
  const stops = stopsQuery.data ?? [];
  const selectedIds = new Set(stops.map((s) => s.doctor_id));

  async function invalidate(routeId: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['route', 'today-draft', sectorId, date] }),
      queryClient.invalidateQueries({ queryKey: ['route-stops', routeId] }),
      queryClient.invalidateQueries({ queryKey: ['routes', sectorId] }),
    ]);
  }

  async function toggle(doctorId: string) {
    if (!sectorId) return;
    if (selectedIds.has(doctorId) && route) {
      await removeStopFromRoute(route.id, doctorId);
      await invalidate(route.id);
      return;
    }
    const target = route ?? (await getOrCreateDraftRouteForDate(sectorId, date));
    const nextOrdre = stops.length ? Math.max(...stops.map((s) => s.ordre)) + 1 : 1;
    await addStopToRoute(target.id, doctorId, nextOrdre);
    await invalidate(target.id);
  }

  return {
    routeId: route?.id ?? null,
    selectedIds,
    count: selectedIds.size,
    toggle,
  };
}
