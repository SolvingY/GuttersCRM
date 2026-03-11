import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  role: string;
  loading: boolean;
  isAdmin: boolean;
  isCanvasser: boolean;
  hasSalesRole: boolean;
  hasCanvasserRole: boolean;
  hasSupplementerRole: boolean;
  hasProductionRole: boolean;
  isSupplementerOnly: boolean;
  isProductionOnly: boolean;
  isDualRole: boolean;
  activeView: 'sales' | 'canvasser' | 'supplementer' | 'production';
  onboardingComplete: boolean;
  hasPendingMandatoryActions: boolean;
  setActiveView: (view: 'sales' | 'canvasser' | 'supplementer' | 'production') => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    const { data } = await (supabase
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
    const { count } = await (supabase
      .from('mandatory_actions' as any) as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('blocks_access', true);

    return (count ?? 0) > 0;
  }, []);

  const fetchAllUserData = useCallback(async (userId: string) => {
    const [roles, profileData, hasMandatory] = await Promise.all([
      fetchUserRoles(userId),
      fetchProfileData(userId),
      fetchMandatoryActions(userId),
    ]);
    setAuthState(prev => ({
      ...prev,
      roles,
      activeView: profileData.preferredView,
      onboardingComplete: profileData.onboardingComplete,
      hasPendingMandatoryActions: hasMandatory,
      roleLoading: false,
    }));
  }, [fetchUserRoles, fetchProfileData, fetchMandatoryActions]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESHED: silently update session/user, do NOT re-fetch roles
        if (event === 'TOKEN_REFRESHED') {
          setAuthState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
          }));
          return;
        }

        // INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, USER_UPDATED: full state reset
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          sessionLoading: false,
          roleLoading: session?.user ? true : false,
        }));

        if (session?.user) {
          setTimeout(() => fetchAllUserData(session.user.id), 0);
        } else {
          setAuthState(prev => ({ ...prev, roles: [], roleLoading: false }));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        sessionLoading: false,
        roleLoading: session?.user ? true : false,
      }));

      if (session?.user) {
        await fetchAllUserData(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, roleLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAllUserData]);

  const loading = authState.sessionLoading || authState.roleLoading;

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
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
    if (error && !error.message?.includes('session')) {
      return { error };
    }
    return { error: null };
  }, []);

  const setActiveView = useCallback(async (view: 'sales' | 'canvasser' | 'supplementer' | 'production') => {
    setAuthState(prev => ({ ...prev, activeView: view }));
    if (authState.user) {
      await supabase
        .from('profiles')
        .update({ preferred_view: view })
        .eq('id', authState.user.id);
    }
  }, [authState.user]);

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

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = authState.roles.includes('admin');
    const hasSalesRole = authState.roles.includes('user') || authState.roles.includes('admin');
    const hasCanvasserRole = authState.roles.includes('canvasser');
    const hasSupplementerRole = authState.roles.includes('supplementer');
    const hasProductionRole = authState.roles.includes('production');
    const roleCount = [hasSalesRole, hasCanvasserRole, hasSupplementerRole, hasProductionRole].filter(Boolean).length;
    const isDualRole = roleCount >= 2;
    const isSupplementerOnly = hasSupplementerRole && !hasSalesRole && !hasCanvasserRole && !hasProductionRole && !isAdmin;
    const isProductionOnly = hasProductionRole && !hasSalesRole && !hasCanvasserRole && !hasSupplementerRole && !isAdmin;
    const role = isAdmin ? 'admin' : hasCanvasserRole && !hasSalesRole ? 'canvasser' : hasSupplementerRole && !hasSalesRole ? 'supplementer' : hasProductionRole && !hasSalesRole ? 'production' : 'user';
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
      hasSupplementerRole,
      hasProductionRole,
      isSupplementerOnly,
      isProductionOnly,
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
  }, [authState, loading, setActiveView, refreshOnboardingStatus, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
