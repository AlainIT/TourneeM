import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listImports, pickAndImportTargetingFile } from '../lib/api/imports';

export function useImports(sectorId: string | undefined) {
  return useQuery({
    queryKey: ['imports', sectorId],
    queryFn: () => listImports(sectorId!),
    enabled: !!sectorId,
  });
}

export function useRunImport(sectorId: string | undefined) {
  const queryClient = useQueryClient();
  return async () => {
    if (!sectorId) return null;
    const result = await pickAndImportTargetingFile(sectorId);
    if (result) {
      await queryClient.invalidateQueries({ queryKey: ['imports', sectorId] });
      await queryClient.invalidateQueries({ queryKey: ['doctors', sectorId] });
    }
    return result;
  };
}
