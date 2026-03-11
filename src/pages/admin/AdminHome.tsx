import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAdminShortcutPreferences } from '@/hooks/useAdminShortcutPreferences';
import { AdminShortcutPanel } from '@/components/admin/AdminShortcutPanel';
import { ShortcutPickerDrawer } from '@/components/admin/ShortcutPickerDrawer';

export default function AdminHome() {
  const { user } = useAuth();
  const { pinnedShortcuts, loading, savePinnedShortcuts } = useAdminShortcutPreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Try user_metadata first, then fall back to profiles table
    const metaName = user.user_metadata?.full_name as string | undefined;
    if (metaName) {
      setFirstName(metaName.split(' ')[0]);
      return;
    }
    // Fetch from profiles
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) {
          setFirstName(data.full_name.split(' ')[0]);
        }
      });
  }, [user]);

  return (
    <div className="p-2 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </h1>
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
