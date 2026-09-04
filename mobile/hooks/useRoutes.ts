import { useQuery } from '@tanstack/react-query';
import { getRoute, getRouteStopsWithDoctors, listRoutes } from '../lib/api/routes';

export function useRoutes(sectorId: string | undefined) {
  return useQuery({
    queryKey: ['routes', sectorId],
    queryFn: () => listRoutes(sectorId!),
    enabled: !!sectorId,
  });
}

export function useRoute(routeId: string) {
  return useQuery({
    queryKey: ['route', routeId],
    queryFn: () => getRoute(routeId),
    enabled: !!routeId,
  });
}

export function useRouteStops(routeId: string) {
  return useQuery({
    queryKey: ['route-stops', routeId],
    queryFn: () => getRouteStopsWithDoctors(routeId),
    enabled: !!routeId,
  });
}
