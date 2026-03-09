import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCanvasser?: boolean;
  requireSupplementer?: boolean;
  requireProduction?: boolean;
  skipOnboardingCheck?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireCanvasser = false, requireSupplementer = false, requireProduction = false, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isCanvasser, isDualRole, hasSalesRole, hasCanvasserRole, hasSupplementerRole, hasProductionRole, isSupplementerOnly, isProductionOnly, activeView, onboardingComplete, hasPendingMandatoryActions } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireCanvasser && !hasCanvasserRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSupplementer && !hasSupplementerRole && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireProduction && !hasProductionRole && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Onboarding gate
  if (!skipOnboardingCheck && !isAdmin && !onboardingComplete) {
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    if (!isOnboardingRoute) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Mandatory actions gate
  if (!skipOnboardingCheck && !isAdmin && hasPendingMandatoryActions) {
    const isMandatoryRoute = location.pathname.startsWith('/mandatory-actions');
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    if (!isMandatoryRoute && !isOnboardingRoute) {
      return <Navigate to="/mandatory-actions" replace />;
    }
  }

  // Handle multi-role users
  if (isDualRole) {
    return <>{children}</>;
  }

  // Allow all roles to access /dashboard/tools
  const isToolsRoute = location.pathname.startsWith('/dashboard/tools');

  // Redirect production-only users
  if (isProductionOnly && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/production" replace />;
  }
  if (isProductionOnly && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/production" replace />;
  }
  if (isProductionOnly && location.pathname.startsWith('/supplementer')) {
    return <Navigate to="/production" replace />;
  }

  // Redirect supplementer-only users
  if (isSupplementerOnly && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/supplementer" replace />;
  }
  if (isSupplementerOnly && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/supplementer" replace />;
  }

  // Redirect canvasser-only users
  if (isCanvasser && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/canvasser" replace />;
  }

  // Redirect sales-only users away from other portals
  if (!hasCanvasserRole && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!hasSupplementerRole && location.pathname.startsWith('/supplementer')) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!hasProductionRole && location.pathname.startsWith('/production')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
