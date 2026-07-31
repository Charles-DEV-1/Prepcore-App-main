import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let hydrationCompleted = false;

    const handleHydrationComplete = (nextSession: Session | null, nextUser: User | null = nextSession?.user ?? null) => {
      if (!mounted || hydrationCompleted) return;

      hydrationCompleted = true;
      setSession(nextSession);
      setUser(nextUser);
      setIsLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      console.log('useAuth: Auth state changed:', _event);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        handleHydrationComplete(nextSession, nextSession?.user ?? null);
      }
    });

    async function loadSession() {
      try {
        console.log('useAuth: Starting session load...');

        timeout = setTimeout(() => {
          if (mounted) {
            console.warn('useAuth: Session load timeout, continuing with no session');
            setSession(null);
            setUser(null);
            handleHydrationComplete(null);
          }
        }, 8000);

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('useAuth: getSession error:', error.message);
        }

        if (!mounted) return;

        console.log('useAuth: Session loaded:', !!data.session);
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);

        if (data.session) {
          handleHydrationComplete(data.session);
          return;
        }

        const {
          data: userData,
          error: userError
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError) {
          console.warn('useAuth: getUser fallback error:', userError.message);
          return;
        }

        if (userData.user) {
          console.log('useAuth: Resolved auth state from getUser fallback for user:', userData.user.id);
          setSession(null);
          setUser(userData.user);
          handleHydrationComplete(null, userData.user);
        }
      } catch (err) {
        console.warn('useAuth: getSession exception:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          handleHydrationComplete(null);
        }
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    loadSession();

    return () => {
      mounted = false;
      if (timeout) clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, isLoading };
}
