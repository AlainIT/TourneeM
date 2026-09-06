import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteVisit, listVisitsForDoctor, markVisited } from '../lib/api/visits';

export function useDoctorVisits(doctorId: string) {
  return useQuery({
    queryKey: ['visits', 'doctor', doctorId],
    queryFn: () => listVisitsForDoctor(doctorId),
    enabled: !!doctorId,
  });
}

export function useMarkVisited(doctorId: string, sectorId: string | undefined) {
  const queryClient = useQueryClient();
  return async (note?: string) => {
    if (!sectorId) return;
    await markVisited({ doctorId, sectorId, note });
    await queryClient.invalidateQueries({ queryKey: ['visits', 'doctor', doctorId] });
    await queryClient.invalidateQueries({ queryKey: ['visits', 'last-per-doctor', sectorId] });
  };
}

// Annuler une visite marquée par erreur.
export function useDeleteVisit(doctorId: string, sectorId: string | undefined) {
  const queryClient = useQueryClient();
  return async (visitId: string) => {
    await deleteVisit(visitId);
    await queryClient.invalidateQueries({ queryKey: ['visits', 'doctor', doctorId] });
    if (sectorId) await queryClient.invalidateQueries({ queryKey: ['visits', 'last-per-doctor', sectorId] });
  };
}
