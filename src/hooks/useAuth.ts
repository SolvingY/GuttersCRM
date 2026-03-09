import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'user' | 'canvasser' | 'supplementer' | 'production';

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  activeView: 'sales' | 'canvasser' | 'supplementer' | 'production';
  onboardingComplete: boolean;
  hasPendingMandatoryActions: boolean;
  sessionLoading: boolean;
  roleLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    activeView: 'sales',
    onboardingComplete: true,
    hasPendingMandatoryActions: false,
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

  const fetchProfileData = useCallback(async (userId: string): Promise<{
    preferredView: 'sales' | 'canvasser' | 'supplementer';
    onboardingComplete: boolean;
  }> => {
    const { data, error } = await (supabase
      .from('profiles') as any)
      .select('preferred_view, onboarding_complete')
      .eq('id', userId)
      .maybeSingle();

    return {
      preferredView: (data?.preferred_view as 'sales' | 'canvasser' | 'supplementer') || 'sales',
      onboardingComplete: data?.onboarding_complete ?? true,
    };
  }, []);

  const fetchMandatoryActions = useCallback(async (userId: string): Promise<boolean> => {
    const { count, error } = await (supabase
      .from('mandatory_actions' as any) as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('blocks_access', true);

    return (count ?? 0) > 0;
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
            const [roles, profileData, hasMandatory] = await Promise.all([
              fetchUserRoles(session.user.id),
              fetchProfileData(session.user.id),
              fetchMandatoryActions(session.user.id),
            ]);
            setAuthState(prev => ({
              ...prev,
              roles,
              activeView: profileData.preferredView,
              onboardingComplete: profileData.onboardingComplete,
              hasPendingMandatoryActions: hasMandatory,
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
        const [roles, profileData, hasMandatory] = await Promise.all([
          fetchUserRoles(session.user.id),
          fetchProfileData(session.user.id),
          fetchMandatoryActions(session.user.id),
        ]);
        setAuthState(prev => ({
          ...prev,
          roles,
          activeView: profileData.preferredView,
          onboardingComplete: profileData.onboardingComplete,
          hasPendingMandatoryActions: hasMandatory,
          roleLoading: false
        }));
      } else {
        setAuthState(prev => ({ ...prev, roleLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoles, fetchProfileData, fetchMandatoryActions]);

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
      onboardingComplete: true,
      hasPendingMandatoryActions: false,
      sessionLoading: false,
      roleLoading: false,
    });
    
    // Only return error if it's NOT a session_not_found error
    if (error && !error.message?.includes('session')) {
      return { error };
    }
    return { error: null };
  };

  const setActiveView = async (view: 'sales' | 'canvasser' | 'supplementer' | 'production') => {
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
  const hasSupplementerRole = authState.roles.includes('supplementer');
  const hasProductionRole = authState.roles.includes('production');
  const roleCount = [hasSalesRole, hasCanvasserRole, hasSupplementerRole, hasProductionRole].filter(Boolean).length;
  const isDualRole = roleCount >= 2;
  const isSupplementerOnly = hasSupplementerRole && !hasSalesRole && !hasCanvasserRole && !hasProductionRole && !isAdmin;
  const isProductionOnly = hasProductionRole && !hasSalesRole && !hasCanvasserRole && !hasSupplementerRole && !isAdmin;
  
  // Legacy compatibility - primary role for routing decisions
  const role = isAdmin ? 'admin' : hasCanvasserRole && !hasSalesRole ? 'canvasser' : hasSupplementerRole && !hasSalesRole ? 'supplementer' : hasProductionRole && !hasSalesRole ? 'production' : 'user';
  const isCanvasser = hasCanvasserRole && !hasSalesRole && !isAdmin;

  const refreshOnboardingStatus = useCallback(async () => {
    if (!authState.user) return;
    const [profileData, hasMandatory] = await Promise.all([
      fetchProfileData(authState.user.id),
      fetchMandatoryActions(authState.user.id),
    ]);
    setAuthState(prev => ({
      ...prev,
      onboardingComplete: profileData.onboardingComplete,
      hasPendingMandatoryActions: hasMandatory,
    }));
  }, [authState.user, fetchProfileData, fetchMandatoryActions]);

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
    hasSupplementerRole,
    isSupplementerOnly,
    isDualRole,
    activeView: authState.activeView,
    onboardingComplete: authState.onboardingComplete,
    hasPendingMandatoryActions: authState.hasPendingMandatoryActions,
    setActiveView,
    refreshOnboardingStatus,
    signIn,
    signUp,
    signOut,
  };
}
