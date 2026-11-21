import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AppRole, Profile } from './database.types';
import { loginToEmail } from './login';
import { supabase } from './supabase';

type AuthState = {
  ready: boolean;
  profileError: boolean;
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
  const [profileError, setProfileError] = useState(false);
  // Signed in but the profile has not come back yet: show nothing rather than "waiting for access".
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setProfileError(false);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfileError(!!error);
    if (!error) setProfile(data ?? null);
    setProfileLoading(false);
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
      if (s) setProfileLoading(true);
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
    return { ready: ready && !(session && profileLoading && !profile), profileError, session, profile, role, isOwner: role === 'owner', signIn, signOut, refreshProfile };
  }, [ready, profileLoading, profileError, session, profile, signIn, signOut, refreshProfile]);

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
