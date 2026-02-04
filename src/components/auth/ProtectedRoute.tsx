import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCanvasser?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireCanvasser = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isCanvasser, isDualRole, hasSalesRole, hasCanvasserRole, activeView } = useAuth();
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

  // Handle dual-role users - they can access both portals
  if (isDualRole) {
    // Let them access whatever portal they're on
    return <>{children}</>;
  }

  // Redirect canvasser-only users away from sales dashboard to canvasser dashboard
  if (isCanvasser && location.pathname.startsWith('/dashboard')) {
    return <Navigate to="/canvasser" replace />;
  }

  // Redirect sales-only users away from canvasser portal
  if (!hasCanvasserRole && location.pathname.startsWith('/canvasser')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
