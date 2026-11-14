import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AppRole, Profile } from './database.types';
import { loginToEmail } from './login';
import { supabase } from './supabase';

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isOwner: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer the query so it doesn't run inside the auth callback.
      setTimeout(() => loadProfile(s), 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (login: string, password: string) => {
    const email = loginToEmail(login);
    if (!email) throw new Error('Enter your 10-digit mobile number or email.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(/invalid/i.test(error.message) ? 'Mobile/email or password is not correct.' : error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  const value = useMemo<AuthState>(() => {
    const role = profile?.active ? profile.role : null;
    return { ready, session, profile, role, isOwner: role === 'owner', signIn, signOut, refreshProfile };
  }, [ready, session, profile, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: 'Owner',
  sales: 'Sales',
  despatch: 'Despatch',
  factory: 'Factory',
};
