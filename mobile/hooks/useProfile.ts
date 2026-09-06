import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearHomeAddress, getMyProfile, updateHomeAddress } from '../lib/api/profile';

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'mine'],
    queryFn: getMyProfile,
    staleTime: 60 * 60_000,
  });
}

export function useUpdateHomeAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateHomeAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'mine'] }),
  });
}

export function useClearHomeAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearHomeAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'mine'] }),
  });
}
