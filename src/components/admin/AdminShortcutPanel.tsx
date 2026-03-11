import { useNavigate } from 'react-router-dom';
import { icons } from 'lucide-react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SHORTCUT_REGISTRY } from '@/lib/shortcutRegistry';

interface AdminShortcutPanelProps {
  pinnedShortcuts: string[];
  loading: boolean;
  onEditClick: () => void;
}

export function AdminShortcutPanel({ pinnedShortcuts, loading, onEditClick }: AdminShortcutPanelProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const resolved = pinnedShortcuts
    .map((id) => SHORTCUT_REGISTRY.find((s) => s.id === id))
    .filter(Boolean) as typeof SHORTCUT_REGISTRY;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Quick Access</h2>
        <Button variant="ghost" size="sm" onClick={onEditClick} className="text-xs text-muted-foreground">
          <Settings2 className="h-4 w-4 mr-1.5" />
          Edit Shortcuts
        </Button>
      </div>

      {resolved.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No shortcuts pinned. Click Edit Shortcuts to customize your home screen.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {resolved.map((shortcut) => {
            const IconComponent = (icons as any)[shortcut.icon];
            return (
              <button
                key={shortcut.id}
                onClick={() => navigate(shortcut.route)}
                className="flex flex-col items-center justify-center h-[88px] rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              >
                {IconComponent && <IconComponent className="h-[22px] w-[22px] text-foreground mb-2" />}
                <span className="text-xs font-medium text-foreground">{shortcut.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
