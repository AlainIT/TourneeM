import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSession } from './useSession';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({ session: null, loading: true });

export function SessionProvider({ children }: PropsWithChildren) {
  const { session, loading } = useSession();
  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  return useContext(SessionContext);
}
