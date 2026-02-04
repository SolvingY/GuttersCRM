import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'user' | 'canvasser';

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  activeView: 'sales' | 'canvasser';
  sessionLoading: boolean;
  roleLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    activeView: 'sales',
    sessionLoading: true,
    roleLoading: true,
  });

  const fetchUserRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    // Fetch all roles for the user
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return ['user'];
    }

    if (!data || data.length === 0) {
      return ['user'];
    }

    return data.map(r => r.role as AppRole);
  }, []);

  const fetchPreferredView = useCallback(async (userId: string): Promise<'sales' | 'canvasser'> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_view')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data?.preferred_view) {
      return 'sales';
    }

    return data.preferred_view as 'sales' | 'canvasser';
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
          setTimeout(async () => {
            const [roles, preferredView] = await Promise.all([
              fetchUserRoles(session.user.id),
              fetchPreferredView(session.user.id),
            ]);
            setAuthState(prev => ({ 
              ...prev, 
              roles, 
              activeView: preferredView,
              roleLoading: false 
            }));
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, roles: [], roleLoading: false }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        sessionLoading: false,
        roleLoading: session?.user ? true : false,
      }));

      if (session?.user) {
        const [roles, preferredView] = await Promise.all([
          fetchUserRoles(session.user.id),
          fetchPreferredView(session.user.id),
        ]);
        setAuthState(prev => ({ 
          ...prev, 
          roles, 
          activeView: preferredView,
          roleLoading: false 
        }));
      } else {
        setAuthState(prev => ({ ...prev, roleLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoles, fetchPreferredView]);

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
    // Use scope: 'local' to clear local tokens even if server session is gone/expired
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    
    // Always clear local state - if session was missing, user is still "signed out"
    setAuthState({
      user: null,
      session: null,
      roles: [],
      activeView: 'sales',
      sessionLoading: false,
      roleLoading: false,
    });
    
    // Only return error if it's NOT a session_not_found error
    if (error && !error.message?.includes('session')) {
      return { error };
    }
    return { error: null };
  };

  const setActiveView = async (view: 'sales' | 'canvasser') => {
    setAuthState(prev => ({ ...prev, activeView: view }));
    
    // Save preference to database
    if (authState.user) {
      await supabase
        .from('profiles')
        .update({ preferred_view: view })
        .eq('id', authState.user.id);
    }
  };

  // Role checks
  const isAdmin = authState.roles.includes('admin');
  const hasSalesRole = authState.roles.includes('user') || authState.roles.includes('admin');
  const hasCanvasserRole = authState.roles.includes('canvasser');
  const isDualRole = hasSalesRole && hasCanvasserRole;
  
  // Legacy compatibility - primary role for routing decisions
  const role = isAdmin ? 'admin' : hasCanvasserRole && !hasSalesRole ? 'canvasser' : 'user';
  const isCanvasser = hasCanvasserRole && !hasSalesRole && !isAdmin;

  return {
    user: authState.user,
    session: authState.session,
    roles: authState.roles,
    role,
    loading,
    isAdmin,
    isCanvasser,
    hasSalesRole,
    hasCanvasserRole,
    isDualRole,
    activeView: authState.activeView,
    setActiveView,
    signIn,
    signUp,
    signOut,
  };
}
