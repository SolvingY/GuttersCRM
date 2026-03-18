import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCanvasser?: boolean;
  requireSupplementer?: boolean;
  requireProduction?: boolean;
  requireOffice?: boolean;
  skipOnboardingCheck?: boolean;
}

function getRoleHome(auth: {
  isAdmin: boolean;
  isCanvasser: boolean;
  isSupplementerOnly: boolean;
  isProductionOnly: boolean;
  isOfficeOnly: boolean;
  hasSalesRole: boolean;
  hasCanvasserRole: boolean;
}): string {
  if (auth.isAdmin) return '/admin';
  if (auth.isOfficeOnly) return '/office/dashboard';
  if (auth.isProductionOnly) return '/production';
  if (auth.isSupplementerOnly) return '/supplementer';
  if (auth.isCanvasser) return '/canvasser';
  if (auth.hasSalesRole) return '/dashboard';
  return '/';
}

export function ProtectedRoute({ children, requireAdmin = false, requireCanvasser = false, requireSupplementer = false, requireProduction = false, requireOffice = false, skipOnboardingCheck = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isCanvasser, isDualRole, hasSalesRole, hasCanvasserRole, hasSupplementerRole, hasProductionRole, hasOfficeRole, isSupplementerOnly, isProductionOnly, isOfficeOnly, activeView, onboardingComplete, hasPendingMandatoryActions } = useAuth();
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

  const roleHome = getRoleHome({ isAdmin, isCanvasser, isSupplementerOnly, isProductionOnly, isOfficeOnly, hasSalesRole, hasCanvasserRole });

  if (requireAdmin && !isAdmin) {
    return <Navigate to={roleHome} replace />;
  }

  if (requireCanvasser && !hasCanvasserRole) {
    return <Navigate to={roleHome} replace />;
  }

  if (requireSupplementer && !hasSupplementerRole && !isAdmin) {
    return <Navigate to={roleHome} replace />;
  }

  if (requireProduction && !hasProductionRole && !isAdmin) {
    return <Navigate to={roleHome} replace />;
  }

  if (requireOffice && !hasOfficeRole && !isAdmin) {
    return <Navigate to={roleHome} replace />;
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

  // Redirect office-only users
  if (isOfficeOnly && !location.pathname.startsWith('/office') && !location.pathname.startsWith('/onboarding') && !location.pathname.startsWith('/mandatory-actions')) {
    return <Navigate to="/office/dashboard" replace />;
  }

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
  if (isProductionOnly && location.pathname.startsWith('/office')) {
    return <Navigate to="/production" replace />;
  }

  // Redirect supplementer-only users
  if (isSupplementerOnly && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/supplementer" replace />;
  }
  if (isSupplementerOnly && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/supplementer" replace />;
  }
  if (isSupplementerOnly && location.pathname.startsWith('/office')) {
    return <Navigate to="/supplementer" replace />;
  }

  // Redirect canvasser-only users
  if (isCanvasser && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/canvasser" replace />;
  }
  if (isCanvasser && location.pathname.startsWith('/office')) {
    return <Navigate to="/canvasser" replace />;
  }

  // Redirect sales-only users away from other portals
  if (!hasCanvasserRole && location.pathname.startsWith('/canvasser')) {
    return <Navigate to={roleHome} replace />;
  }
  if (!hasSupplementerRole && location.pathname.startsWith('/supplementer')) {
    return <Navigate to={roleHome} replace />;
  }
  if (!hasProductionRole && location.pathname.startsWith('/production')) {
    return <Navigate to={roleHome} replace />;
  }
  if (!hasOfficeRole && !isAdmin && location.pathname.startsWith('/office')) {
    return <Navigate to={roleHome} replace />;
  }

  return <>{children}</>;
}
