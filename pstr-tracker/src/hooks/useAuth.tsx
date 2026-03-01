import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, UserRole, DepartmentType } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  hasDepartment: (...depts: DepartmentType[]) => boolean;
  isAdmin: boolean;
  isComplianceOfficer: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
    return data as UserProfile;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let profile: UserProfile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }
      setState({
        session,
        user: session?.user ?? null,
        profile,
        loading: false,
        error: null,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let profile: UserProfile | null = null;
        if (session?.user) {
          profile = await fetchProfile(session.user.id);
        }
        setState({
          session,
          user: session?.user ?? null,
          profile,
          loading: false,
          error: null,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, profile: null, loading: false, error: null });
  };

  const hasRole = (...roles: UserRole[]) => {
    return state.profile ? roles.includes(state.profile.role) : false;
  };

  const hasDepartment = (...depts: DepartmentType[]) => {
    return state.profile ? depts.includes(state.profile.department) : false;
  };

  const isAdmin = hasRole('admin');
  const isComplianceOfficer = hasRole('compliance_officer');
  const canEdit = hasRole('admin', 'compliance_officer', 'department_user');

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, hasRole, hasDepartment, isAdmin, isComplianceOfficer, canEdit }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
