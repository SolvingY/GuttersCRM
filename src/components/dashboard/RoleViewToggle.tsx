import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Briefcase, Users, FileText } from 'lucide-react';

export function RoleViewToggle() {
  const { isDualRole, activeView, setActiveView, hasSalesRole, hasCanvasserRole, hasSupplementerRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isDualRole) return null;

  const handleViewChange = (value: string) => {
    if (!value) return;
    
    const newView = value as 'sales' | 'canvasser' | 'supplementer';
    setActiveView(newView);
    
    if (newView === 'canvasser') {
      if (!location.pathname.startsWith('/canvasser')) {
        navigate('/canvasser');
      }
    } else if (newView === 'supplementer') {
      if (!location.pathname.startsWith('/supplementer')) {
        navigate('/supplementer');
      }
    } else if (newView === 'sales') {
      if (!location.pathname.startsWith('/dashboard')) {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
      <span className="text-xs text-muted-foreground hidden sm:block">View as:</span>
      <ToggleGroup type="single" value={activeView} onValueChange={handleViewChange} size="sm">
        {hasSalesRole && (
          <ToggleGroupItem value="sales" aria-label="Sales Rep View" className="text-xs gap-1.5 px-2">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sales</span>
          </ToggleGroupItem>
        )}
        {hasCanvasserRole && (
          <ToggleGroupItem value="canvasser" aria-label="Canvasser View" className="text-xs gap-1.5 px-2">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Canvasser</span>
          </ToggleGroupItem>
        )}
        {hasSupplementerRole && (
          <ToggleGroupItem value="supplementer" aria-label="Supplementer View" className="text-xs gap-1.5 px-2">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Supplementer</span>
          </ToggleGroupItem>
        )}
      </ToggleGroup>
    </div>
  );
}
