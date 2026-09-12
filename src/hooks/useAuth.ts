import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (__DEV__) console.log('[AUTH] auth state changed:', event, { hasSession: Boolean(nextSession), userId: nextSession?.user?.id ?? null });
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (event === 'INITIAL_SESSION') setIsLoading(false);
    });

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        if (__DEV__) console.log('[AUTH] initial session:', { hasSession: Boolean(data.session), userId: data.session?.user?.id ?? null });
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
      } catch (err) {
        if (__DEV__) console.warn('[AUTH] initial session error:', err instanceof Error ? err.message : err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, isLoading };
}
