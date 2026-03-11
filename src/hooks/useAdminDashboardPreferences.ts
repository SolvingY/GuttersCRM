import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from '@/lib/widgetRegistry';

export function useAdminDashboardPreferences() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('admin_dashboard_preferences' as any)
        .select('widget_config')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.widget_config) {
        // Merge with defaults so new widgets get default visibility
        setConfig({ ...DEFAULT_WIDGET_CONFIG, ...(data.widget_config as WidgetConfig) });
      }
    } catch {
      // Silent fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = useCallback(async (newConfig: WidgetConfig) => {
    setConfig(newConfig);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from('admin_dashboard_preferences' as any) as any).upsert(
        { user_id: user.id, widget_config: newConfig, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch {
      // Silent failure
    }
  }, []);

  const isWidgetVisible = useCallback((id: string): boolean => {
    return config[id] ?? true;
  }, [config]);

  return { config, loading, savePreferences, isWidgetVisible };
}
