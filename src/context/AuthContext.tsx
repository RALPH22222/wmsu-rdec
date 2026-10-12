import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfile, type UserProfileData } from '../lib/api';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  loadingProfile: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  loadingProfile: false,
  authError: null,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const profileRequest = useRef(0);
  // The user whose profile is loaded (or loading). Supabase re-emits auth events on token
  // refresh and every time the tab becomes visible; the profile only needs reloading when
  // the signed-in user actually changes.
  const profileUserId = useRef<string | null>(null);
  // The non-silent request that owns the loading flag, so a later silent refresh can't leave it stuck on.
  const loadingRequest = useRef(0);

  const fetchUserProfile = useCallback(async (token: string, isSilent = false) => {
    const request = ++profileRequest.current;
    if (!isSilent) {
      loadingRequest.current = request;
      setLoadingProfile(true);
    }
    try {
      const data = await getProfile(token);
      if (!data?.portal_access?.allowed) throw new Error('Unable to verify access to your Call for Proposals window.');
      if (request !== profileRequest.current) return;
      setProfile(data);
      setAuthError(null);
    } catch (error) {
      if (request !== profileRequest.current) return;
      setAuthError(error instanceof Error ? error.message : 'Unable to verify portal access.');
      // Never forcefully destroy session or sign out on background revalidation errors
      if (!isSilent) {
        setProfile(null);
        // Let the next auth event (sign-in, tab refocus) retry the load.
        profileUserId.current = null;
      }
    } finally {
      if (!isSilent && request === loadingRequest.current) setLoadingProfile(false);
    }
  }, []);

  const refreshProfile = useCallback(async (isSilent = true) => {
    if (session?.access_token) {
      await fetchUserProfile(session.access_token, isSilent);
    }
  }, [session, fetchUserProfile]);

  /** Loads the profile only when the signed-in user changes; clears it on sign-out. */
  const syncProfile = useCallback((nextSession: Session | null) => {
    const userId = nextSession?.user?.id ?? null;
    if (!nextSession?.access_token || !userId) {
      profileUserId.current = null;
      profileRequest.current++;
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    if (profileUserId.current === userId) return; // token refresh or tab refocus: keep the loaded profile
    profileUserId.current = userId;
    fetchUserProfile(nextSession.access_token);
  }, [fetchUserProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      syncProfile(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        syncProfile(newSession);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signOut = async () => {
    // Reset first: if Supabase fails to clear the session it emits no SIGNED_OUT event, and a
    // later sign-in as the same user must still load the profile.
    profileUserId.current = null;
    profileRequest.current++;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoadingProfile(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        loadingProfile,
        authError,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
