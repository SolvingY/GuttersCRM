import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'user' | 'canvasser';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  sessionLoading: boolean;
  roleLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    sessionLoading: true,
    roleLoading: true,
  });

  const fetchUserRole = useCallback(async (userId: string): Promise<AppRole> => {
    // Fetch all roles for the user (should be one after migration, but handle edge cases)
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }

    if (!data || data.length === 0) {
      return 'user';
    }

    // If somehow multiple roles exist, prioritize: admin > canvasser > user
    const roles = data.map(r => r.role as AppRole);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('canvasser')) return 'canvasser';
    return 'user';
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          sessionLoading: false,
          roleLoading: session?.user ? true : false,
        }));

        // Defer role fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(role => {
              setAuthState(prev => ({ ...prev, role, roleLoading: false }));
            });
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, role: null, roleLoading: false }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        sessionLoading: false,
        roleLoading: session?.user ? true : false,
      }));

      if (session?.user) {
        fetchUserRole(session.user.id).then(role => {
          setAuthState(prev => ({ ...prev, role, roleLoading: false }));
        });
      } else {
        setAuthState(prev => ({ ...prev, roleLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  // Loading is true until both session AND role are resolved
  const loading = authState.sessionLoading || authState.roleLoading;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Redirect to /auth so role-based routing can determine the correct portal
    const redirectUrl = `${window.location.origin}/auth`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Immediately clear local state to prevent stale UI
    if (!error) {
      setAuthState({
        user: null,
        session: null,
        role: null,
        sessionLoading: false,
        roleLoading: false,
      });
    }
    return { error };
  };

  const isAdmin = authState.role === 'admin';
  const isCanvasser = authState.role === 'canvasser';

  return {
    user: authState.user,
    session: authState.session,
    role: authState.role,
    loading,
    isAdmin,
    isCanvasser,
    signIn,
    signUp,
    signOut,
  };
}
