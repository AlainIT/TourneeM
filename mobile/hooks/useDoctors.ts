import { useQuery } from '@tanstack/react-query';
import { listDoctors } from '../lib/api/doctors';

export function useDoctors(sectorId: string | undefined) {
  return useQuery({
    queryKey: ['doctors', sectorId],
    queryFn: () => listDoctors(sectorId!),
    enabled: !!sectorId,
  });
}
