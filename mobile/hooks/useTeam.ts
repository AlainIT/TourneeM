import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inviteManager,
  listManagedSectors,
  listSectorManagers,
  revokeManager,
} from '../lib/api/team';

export function useManagedSectors() {
  return useQuery({
    queryKey: ['team', 'managed-sectors'],
    queryFn: listManagedSectors,
  });
}

export function useSectorManagers(sectorId: string | undefined) {
  return useQuery({
    queryKey: ['team', 'sector-managers', sectorId],
    queryFn: () => listSectorManagers(sectorId!),
    enabled: !!sectorId,
  });
}

export function useInviteManager(sectorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => inviteManager(sectorId!, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', 'sector-managers', sectorId] }),
  });
}

export function useRevokeManager(sectorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (managerId: string) => revokeManager(sectorId!, managerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', 'sector-managers', sectorId] }),
  });
}
