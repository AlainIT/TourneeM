import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000, // 24h — permet la consultation hors-ligne du dernier cache connu
      retry: 2,
    },
  },
});
