import { useQuery } from '@tanstack/react-query';
import { listLastVisitPerDoctor } from '../lib/api/visits';

export function useLastVisits(sectorId: string | undefined) {
  return useQuery({
    queryKey: ['visits', 'last-per-doctor', sectorId],
    queryFn: () => listLastVisitPerDoctor(sectorId!),
    enabled: !!sectorId,
  });
}
