import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getProfile, type UserProfileData } from '../lib/api';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  loadingProfile: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  loadingProfile: false,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchUserProfile = useCallback(async (token: string, currentUserId?: string) => {
    setLoadingProfile(true);
    let resolvedProfile: UserProfileData | null = null;

    // 1. Try Express backend API
    try {
      const data = await getProfile(token);
      if (data && (data.first_name || data.last_name)) {
        resolvedProfile = data;
      }
    } catch {
      // Backend may be offline or unroutable, fallback to direct Supabase
    }

    // 2. If not found or backend was down, fetch directly from Supabase 'users' table
    if (!resolvedProfile) {
      try {
        const uid = currentUserId || (await supabase.auth.getUser()).data.user?.id;
        if (uid) {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, first_name, middle_name, last_name, suffix, email, contact_number, department_id, sex, role, created_at, is_eligible_to_submit, departments:department_id(id, name)')
            .eq('id', uid)
            .maybeSingle();

          if (!error && dbUser) {
            resolvedProfile = dbUser as unknown as UserProfileData;
          }
        }
      } catch (err) {
        console.warn('Direct Supabase profile fetch error:', err);
      }
    }

    if (resolvedProfile) {
      setProfile(resolvedProfile);
    }
    setLoadingProfile(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.access_token) {
      await fetchUserProfile(session.access_token, session.user?.id);
    }
  }, [session, fetchUserProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) {
        fetchUserProfile(session.access_token, session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.access_token) {
          fetchUserProfile(newSession.access_token, newSession.user.id);
        } else {
          setProfile(null);
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
