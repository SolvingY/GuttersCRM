import { useState, useEffect } from 'react';
import { icons } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { SHORTCUT_REGISTRY, DEFAULT_SHORTCUTS } from '@/lib/shortcutRegistry';

const MAX_SHORTCUTS = 6;

interface ShortcutPickerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinnedShortcuts: string[];
  onSave: (shortcuts: string[]) => Promise<void>;
}

export function ShortcutPickerDrawer({ open, onOpenChange, pinnedShortcuts, onSave }: ShortcutPickerDrawerProps) {
  const { toast } = useToast();
  const [local, setLocal] = useState<string[]>(pinnedShortcuts);

  useEffect(() => {
    if (open) setLocal(pinnedShortcuts);
  }, [open, pinnedShortcuts]);

  const groups = Array.from(new Set(SHORTCUT_REGISTRY.map((s) => s.group)));

  const toggle = (id: string) => {
    setLocal((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_SHORTCUTS ? [...prev, id] : prev
    );
  };

  const handleSave = async () => {
    await onSave(local);
    onOpenChange(false);
    toast({ title: 'Shortcuts saved' });
  };

  const handleReset = () => {
    setLocal(DEFAULT_SHORTCUTS);
    toast({ title: 'Reset to defaults — click Save to confirm' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Shortcuts</SheetTitle>
          <SheetDescription>Pin up to 6 pages for quick access from your home screen.</SheetDescription>
        </SheetHeader>

        <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
          {local.length} of {MAX_SHORTCUTS} selected
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <TooltipProvider>
            {groups.map((group) => (
              <div key={group}>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{group}</p>
                <div className="space-y-0.5">
                  {SHORTCUT_REGISTRY.filter((s) => s.group === group).map((shortcut) => {
                    const checked = local.includes(shortcut.id);
                    const atLimit = local.length >= MAX_SHORTCUTS && !checked;
                    const IconComponent = (icons as any)[shortcut.icon];

                    const row = (
                      <label
                        key={shortcut.id}
                        className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="flex-1 text-sm text-foreground">{shortcut.label}</span>
                        <Checkbox
                          checked={checked}
                          disabled={atLimit}
                          onCheckedChange={() => toggle(shortcut.id)}
                        />
                      </label>
                    );

                    if (atLimit) {
                      return (
                        <Tooltip key={shortcut.id}>
                          <TooltipTrigger asChild>{row}</TooltipTrigger>
                          <TooltipContent side="left">Remove a shortcut to add another</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return row;
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>

        <SheetFooter className="flex-row justify-between gap-2 pt-4 border-t border-border mt-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Shortcuts
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
