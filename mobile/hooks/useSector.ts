import { useQuery } from '@tanstack/react-query';
import { getMySector } from '../lib/api/sectors';

export function useSector() {
  return useQuery({
    queryKey: ['sector', 'mine'],
    queryFn: getMySector,
    staleTime: 60 * 60_000,
  });
}
