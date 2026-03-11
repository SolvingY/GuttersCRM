import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { WIDGET_REGISTRY, DEFAULT_WIDGET_CONFIG, type WidgetConfig } from '@/lib/widgetRegistry';
import { toast } from 'sonner';

interface DashboardSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WidgetConfig;
  onSave: (config: WidgetConfig) => Promise<void>;
}

export function DashboardSettingsDrawer({ open, onOpenChange, config, onSave }: DashboardSettingsDrawerProps) {
  const [local, setLocal] = useState<WidgetConfig>(config);

  useEffect(() => {
    if (open) setLocal(config);
  }, [open, config]);

  const toggle = (id: string) => {
    setLocal(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    await onSave(local);
    onOpenChange(false);
    toast.success('Dashboard updated');
  };

  const handleReset = async () => {
    await onSave(DEFAULT_WIDGET_CONFIG);
    onOpenChange(false);
    toast.success('Dashboard reset to defaults');
  };

  const salesWidgets = WIDGET_REGISTRY.filter(w => w.tab === 'sales');
  const canvasserWidgets = WIDGET_REGISTRY.filter(w => w.tab === 'canvassers');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize Your Dashboard</SheetTitle>
          <SheetDescription>Toggle widgets on or off to personalize your overview.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sales Reps</h3>
            <div className="space-y-3">
              {salesWidgets.map(w => (
                <label key={w.id} className="flex items-center justify-between gap-3 py-2 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{w.label}</p>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  </div>
                  <Switch checked={local[w.id] ?? true} onCheckedChange={() => toggle(w.id)} />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Canvassers</h3>
            <div className="space-y-3">
              {canvasserWidgets.map(w => (
                <label key={w.id} className="flex items-center justify-between gap-3 py-2 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{w.label}</p>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  </div>
                  <Switch checked={local[w.id] ?? true} onCheckedChange={() => toggle(w.id)} />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={handleReset}>Reset to Defaults</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
