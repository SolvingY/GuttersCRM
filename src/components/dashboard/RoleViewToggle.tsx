import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Briefcase, Users } from 'lucide-react';

export function RoleViewToggle() {
  const { isDualRole, activeView, setActiveView } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isDualRole) return null;

  const handleViewChange = (value: string) => {
    if (!value) return;
    
    const newView = value as 'sales' | 'canvasser';
    setActiveView(newView);
    
    // Navigate to the appropriate portal
    if (newView === 'canvasser' && !location.pathname.startsWith('/canvasser')) {
      navigate('/canvasser');
    } else if (newView === 'sales' && !location.pathname.startsWith('/dashboard')) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
      <span className="text-xs text-muted-foreground hidden sm:block">View as:</span>
      <ToggleGroup type="single" value={activeView} onValueChange={handleViewChange} size="sm">
        <ToggleGroupItem value="sales" aria-label="Sales Rep View" className="text-xs gap-1.5 px-2">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sales</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="canvasser" aria-label="Canvasser View" className="text-xs gap-1.5 px-2">
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Canvasser</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
