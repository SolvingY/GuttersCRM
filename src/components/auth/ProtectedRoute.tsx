import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCanvasser?: boolean;
  requireSupplementer?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireCanvasser = false, requireSupplementer = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isCanvasser, isDualRole, hasSalesRole, hasCanvasserRole, hasSupplementerRole, isSupplementerOnly, activeView } = useAuth();
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

  // Handle multi-role users - they can access portals they have roles for
  if (isDualRole) {
    return <>{children}</>;
  }

  // Allow all roles to access /dashboard/tools
  const isToolsRoute = location.pathname.startsWith('/dashboard/tools');

  // Redirect supplementer-only users away from sales/canvasser dashboards (except tools)
  if (isSupplementerOnly && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/supplementer" replace />;
  }
  if (isSupplementerOnly && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/supplementer" replace />;
  }

  // Redirect canvasser-only users away from sales dashboard to canvasser dashboard (except tools)
  if (isCanvasser && location.pathname.startsWith('/dashboard') && !isToolsRoute) {
    return <Navigate to="/canvasser" replace />;
  }

  // Redirect sales-only users away from canvasser portal
  if (!hasCanvasserRole && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect non-supplementer users away from supplementer portal
  if (!hasSupplementerRole && location.pathname.startsWith('/supplementer')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
