import { useState } from 'react';
import { useAdminShortcutPreferences } from '@/hooks/useAdminShortcutPreferences';
import { AdminShortcutPanel } from '@/components/admin/AdminShortcutPanel';
import { ShortcutPickerDrawer } from '@/components/admin/ShortcutPickerDrawer';

export default function AdminHome() {
  const { pinnedShortcuts, loading, savePinnedShortcuts } = useAdminShortcutPreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="p-2 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Home</h1>
        <p className="text-sm text-muted-foreground">Quick access to your most-used pages.</p>
      </div>

      <AdminShortcutPanel
        pinnedShortcuts={pinnedShortcuts}
        loading={loading}
        onEditClick={() => setDrawerOpen(true)}
      />

      <ShortcutPickerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pinnedShortcuts={pinnedShortcuts}
        onSave={savePinnedShortcuts}
      />
    </div>
  );
}
