import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SHORTCUTS } from '@/lib/shortcutRegistry';

export function useAdminShortcutPreferences() {
  const [pinnedShortcuts, setPinnedShortcuts] = useState<string[]>(DEFAULT_SHORTCUTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('admin_dashboard_preferences')
      .select('pinned_shortcuts')
      .eq('user_id', user.id)
      .maybeSingle();

    const saved = (data as any)?.pinned_shortcuts;
    if (Array.isArray(saved) && saved.length > 0) {
      setPinnedShortcuts(saved as string[]);
    }
    setLoading(false);
  };

  const savePinnedShortcuts = async (shortcuts: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('admin_dashboard_preferences')
      .upsert(
        {
          user_id: user.id,
          pinned_shortcuts: shortcuts as any,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'user_id' }
      );

    setPinnedShortcuts(shortcuts);
  };

  return { pinnedShortcuts, loading, savePinnedShortcuts };
}
