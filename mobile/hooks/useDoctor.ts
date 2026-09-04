import { useQuery } from '@tanstack/react-query';
import { getDoctor } from '../lib/api/doctors';

export function useDoctor(id: string) {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(id),
    enabled: !!id,
  });
}
