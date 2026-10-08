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

  const fetchUserProfile = useCallback(async (token: string, isSilent = false) => {
    const request = ++profileRequest.current;
    if (!isSilent) setLoadingProfile(true);
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
      }
    } finally {
      if (request === profileRequest.current && !isSilent) setLoadingProfile(false);
    }
  }, []);

  const refreshProfile = useCallback(async (isSilent = true) => {
    if (session?.access_token) {
      await fetchUserProfile(session.access_token, isSilent);
    }
  }, [session, fetchUserProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        fetchUserProfile(session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.access_token) {
          fetchUserProfile(newSession.access_token);
        } else {
          profileRequest.current++;
          setProfile(null);
          setLoadingProfile(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
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
