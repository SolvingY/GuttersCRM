import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, Mail, Globe, BarChart3, Calendar, Clock, Save, Send, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';


const NOTIFICATION_TYPES: { key: string; label: string; description: string }[] = [
  { key: 'new_application', label: 'New Applications', description: 'Job application notifications' },
  { key: 'new_lead', label: 'New Internet Leads', description: 'When a new quote request is submitted' },
  { key: 'new_canvasser_lead', label: 'New Canvasser Leads', description: 'When a canvasser submits a new lead' },
  { key: 'lead_assigned', label: 'Lead Assignments', description: 'When a lead is assigned to a rep' },
  { key: 'flagged_shift', label: 'Flagged Shifts', description: 'When a canvasser shift is flagged' },
];

interface RoutingEntry {
  id: string;
  notification_type: string;
  email: string;
  is_active: boolean;
}

// ── Notification Routing Cards ──────────────────────────────────────────

function NotificationCards() {
  const queryClient = useQueryClient();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['notification-routing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_routing')
        .select('*')
        .order('notification_type')
        .order('email');
      if (error) throw error;
      return data as RoutingEntry[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ type, email }: { type: string; email: string }) => {
      const { data, error } = await supabase
        .from('notification_routing')
        .insert({ notification_type: type, email: email.trim().toLowerCase() })
        .select()
        .single();
      if (error) throw error;
      return data as RoutingEntry;
    },
    onMutate: async ({ type, email }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing']);
      const optimistic: RoutingEntry = { id: `temp-${Date.now()}`, notification_type: type, email: email.trim().toLowerCase(), is_active: true };
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing'], (old = []) => [...old, optimistic]);
      return { previous };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-routing'] }); setNewEmail(''); setAddingTo(null); toast.success('Recipient added'); },
    onError: (err: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notification-routing'], context.previous);
      toast.error(err.message?.includes('duplicate') ? 'This email is already added for this notification type' : 'Failed to add: ' + err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('notification_routing').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing']);
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing'], (old = []) => old.map((e) => (e.id === id ? { ...e, is_active } : e)));
      return { previous };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-routing'] }); },
    onError: (err: any, _vars, context) => { if (context?.previous) queryClient.setQueryData(['notification-routing'], context.previous); toast.error('Failed to update: ' + err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('notification_routing').delete().eq('id', id); if (error) throw error; },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing']);
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing'], (old = []) => old.filter((e) => e.id !== id));
      return { previous };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-routing'] }); toast.success('Recipient removed'); },
    onError: (err: any, _id, context) => { if (context?.previous) queryClient.setQueryData(['notification-routing'], context.previous); toast.error('Failed to remove: ' + err.message); },
  });

  const handleAdd = (type: string) => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast.error('Please enter a valid email'); return; }
    addMutation.mutate({ type, email: newEmail });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      {NOTIFICATION_TYPES.map((type) => {
        const typeEntries = entries.filter((e) => e.notification_type === type.key);
        const isAdding = addingTo === type.key;
        return (
          <Card key={type.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-accent" />{type.label}</CardTitle>
                  <CardDescription className="text-xs mt-1">{type.description}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setAddingTo(isAdding ? null : type.key); setNewEmail(''); }}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdding && (
                <div className="flex gap-2">
                  <Input type="email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd(type.key)} className="flex-1" autoFocus />
                  <Button size="sm" onClick={() => handleAdd(type.key)} disabled={addMutation.isPending}>{addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAddingTo(null); setNewEmail(''); }}>Cancel</Button>
                </div>
              )}
              {typeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No recipients configured. Fallback emails will be used.</p>
              ) : (
                <div className="space-y-2">
                  {typeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Switch checked={entry.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: entry.id, is_active: checked })} />
                        <span className={`text-sm ${!entry.is_active ? 'text-muted-foreground line-through' : ''}`}>{entry.email}</span>
                        {!entry.is_active && <Badge variant="secondary" className="text-[10px]">Paused</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(entry.id)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

// ── Scheduled Performance Report Card ───────────────────────────────────

interface ReportSettingsState {
  scheduled_report_enabled: boolean;
  scheduled_report_frequency: 'weekly' | 'monthly';
  scheduled_report_day: number;
  scheduled_report_recipients: string[];
  include_sales_reps: boolean;
  include_canvassers: boolean;
  include_goals: boolean;
}

function ScheduledReportCard() {
  const { toast: toastUI } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [settings, setSettings] = useState<ReportSettingsState>({
    scheduled_report_enabled: true,
    scheduled_report_frequency: 'weekly',
    scheduled_report_day: 1,
    scheduled_report_recipients: [],
    include_sales_reps: true,
    include_canvassers: true,
    include_goals: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('report_settings').select('setting_key, setting_value');
        if (error) throw error;
        if (data) {
          const ns: Partial<ReportSettingsState> = {};
          data.forEach(row => {
            const key = row.setting_key as keyof ReportSettingsState;
            let value: any = row.setting_value;
            if (typeof value === 'string') { try { value = JSON.parse(value); } catch {} }
            if (value === 'true') value = true;
            if (value === 'false') value = false;
            (ns as any)[key] = value;
          });
          setSettings(prev => ({ ...prev, ...ns }));
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ setting_key: key, setting_value: JSON.stringify(value), updated_at: new Date().toISOString() }));
      for (const u of updates) { const { error } = await supabase.from('report_settings').upsert(u, { onConflict: 'setting_key' }); if (error) throw error; }
      toastUI({ title: 'Settings Saved', description: 'Report settings updated.' });
    } catch (e: any) { toastUI({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSaving(false);
  };

  const handleSendTest = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-scheduled-report', { body: { frequency: settings.scheduled_report_frequency } });
      if (error) throw error;
      toastUI({ title: 'Test Report Sent', description: `Sent to ${data?.recipients || 0} recipient(s).` });
    } catch (e: any) { toastUI({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSending(false);
  };

  const addRecipient = () => {
    if (newEmail && newEmail.includes('@') && !settings.scheduled_report_recipients.includes(newEmail)) {
      setSettings(prev => ({ ...prev, scheduled_report_recipients: [...prev.scheduled_report_recipients, newEmail] }));
      setNewEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setSettings(prev => ({ ...prev, scheduled_report_recipients: prev.scheduled_report_recipients.filter(e => e !== email) }));
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-accent" />Scheduled Performance Report</CardTitle>
            <CardDescription className="text-xs mt-1">Automatically send performance reports to administrators on a schedule</CardDescription>
          </div>
          <Switch checked={settings.scheduled_report_enabled} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, scheduled_report_enabled: checked }))} />
        </div>
      </CardHeader>
      {settings.scheduled_report_enabled && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Frequency</Label>
              <Select value={settings.scheduled_report_frequency} onValueChange={(v: 'weekly' | 'monthly') => setSettings(prev => ({ ...prev, scheduled_report_frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />{settings.scheduled_report_frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}</Label>
              <Select value={String(settings.scheduled_report_day)} onValueChange={(v) => setSettings(prev => ({ ...prev, scheduled_report_day: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {settings.scheduled_report_frequency === 'weekly' ? (
                    <><SelectItem value="1">Monday</SelectItem><SelectItem value="2">Tuesday</SelectItem><SelectItem value="3">Wednesday</SelectItem><SelectItem value="4">Thursday</SelectItem><SelectItem value="5">Friday</SelectItem><SelectItem value="0">Sunday</SelectItem></>
                  ) : (
                    <><SelectItem value="1">1st</SelectItem><SelectItem value="15">15th</SelectItem></>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content toggles */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2"><FileText className="h-4 w-4" />Report Content</Label>
            {[
              { key: 'include_goals' as const, label: 'Company Goals Progress', desc: 'Revenue and leads progress toward goals' },
              { key: 'include_sales_reps' as const, label: 'Sales Rep Leaderboard', desc: 'Top performers and revenue breakdown' },
              { key: 'include_canvassers' as const, label: 'Canvasser Leaderboard', desc: 'Top canvassers and leads breakdown' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                <div><p className="text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                <Switch checked={settings[item.key]} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [item.key]: checked }))} />
              </div>
            ))}
          </div>

          {/* Additional Recipients */}
          <div className="space-y-2">
            <Label>Additional Recipients</Label>
            <p className="text-xs text-muted-foreground">Reports are automatically sent to all admins. Add extra emails below.</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())} className="flex-1" />
              <Button variant="secondary" size="sm" onClick={addRecipient}>Add</Button>
            </div>
            {settings.scheduled_report_recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.scheduled_report_recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">{email}<button onClick={() => removeRecipient(email)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Settings</Button>
            <Button variant="outline" onClick={handleSendTest} disabled={sending || !settings.scheduled_report_enabled} size="sm">{sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Send Test Report</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Canvasser EOD Report Card ───────────────────────────────────────────

function CanvasserEODCard() {
  const { toast: toastUI } = useToast();
  const queryClient = useQueryClient();
  const [sendHour, setSendHour] = useState("21");
  const [frequency, setFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const { data: eodEntries = [] } = useQuery({
    queryKey: ['notification-routing-eod'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_routing')
        .select('*')
        .eq('notification_type', 'canvasser_eod_report')
        .order('email');
      if (error) throw error;
      return data as RoutingEntry[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from('notification_routing').insert({ notification_type: 'canvasser_eod_report', email: email.trim().toLowerCase() });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-routing-eod'] }); setNewEmail(''); setAddingEmail(false); toast.success('Recipient added'); },
    onError: (err: any) => { toast.error(err.message?.includes('duplicate') ? 'Already added' : err.message); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('notification_routing').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing-eod'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing-eod']);
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing-eod'], (old = []) => old.map((e) => (e.id === id ? { ...e, is_active } : e)));
      return { previous };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-routing-eod'] }); },
    onError: (_err, _vars, context) => { if (context?.previous) queryClient.setQueryData(['notification-routing-eod'], context.previous); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('notification_routing').delete().eq('id', id); if (error) throw error; },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing-eod'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing-eod']);
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing-eod'], (old = []) => old.filter((e) => e.id !== id));
      return { previous };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notification-routing-eod'] }); toast.success('Recipient removed'); },
    onError: (_err, _id, context) => { if (context?.previous) queryClient.setQueryData(['notification-routing-eod'], context.previous); },
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('report_settings').select('setting_key, setting_value').in('setting_key', ['canvasser_eod_send_hour', 'canvasser_eod_frequency']);
      if (data) {
        data.forEach((row) => {
          const val = String(row.setting_value || '');
          if (row.setting_key === 'canvasser_eod_send_hour') setSendHour(val || '21');
          if (row.setting_key === 'canvasser_eod_frequency') setFrequency(val || 'daily');
        });
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { setting_key: 'canvasser_eod_send_hour', setting_value: sendHour, updated_at: new Date().toISOString() },
        { setting_key: 'canvasser_eod_frequency', setting_value: frequency, updated_at: new Date().toISOString() },
      ];
      for (const u of updates) { const { error } = await supabase.from('report_settings').upsert(u, { onConflict: 'setting_key' }); if (error) throw error; }
      toastUI({ title: 'Canvasser EOD settings saved' });
    } catch (err: any) { toastUI({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setSaving(false);
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-canvasser-eod-report');
      if (error) throw error;
      toastUI({ title: 'Test report sent', description: 'Check your inbox for the canvasser EOD report.' });
    } catch (err: any) { toastUI({ title: 'Error sending test', description: err.message, variant: 'destructive' }); }
    setSendingTest(false);
  };

  const handleAddEmail = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast.error('Please enter a valid email'); return; }
    addMutation.mutate(newEmail);
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" />Canvasser EOD Report</CardTitle>
            <CardDescription className="text-xs mt-1">Configure the daily canvasser end-of-day summary email</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setAddingEmail(!addingEmail); setNewEmail(''); }}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipients */}
        <div className="space-y-3">
          {addingEmail && (
            <div className="flex gap-2">
              <Input type="email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()} className="flex-1" autoFocus />
              <Button size="sm" onClick={handleAddEmail} disabled={addMutation.isPending}>{addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}</Button>
              <Button variant="ghost" size="sm" onClick={() => { setAddingEmail(false); setNewEmail(''); }}>Cancel</Button>
            </div>
          )}
          {eodEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No recipients configured.</p>
          ) : (
            <div className="space-y-2">
              {eodEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Switch checked={entry.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: entry.id, is_active: checked })} />
                    <span className={`text-sm ${!entry.is_active ? 'text-muted-foreground line-through' : ''}`}>{entry.email}</span>
                    {!entry.is_active && <Badge variant="secondary" className="text-[10px]">Paused</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(entry.id)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />Send Time (CT)</Label>
            <Select value={sendHour} onValueChange={setSendHour}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                  return <SelectItem key={i} value={String(i)}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Note: Update cron schedule in November when clocks fall back.</p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekdays">Weekdays Only</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save EOD Settings</Button>
          <Button variant="outline" onClick={handleSendTest} disabled={sendingTest} size="sm">{sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Send Test Report</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Team Calendar Card ──────────────────────────────────────────────────

function CalendarCard() {
  const { toast: toastUI } = useToast();
  const [calendarUrl, setCalendarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'google_calendar_embed_url').maybeSingle().then(({ data }) => { setCalendarUrl(data?.value || ''); setLoaded(true); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert({ key: 'google_calendar_embed_url', value: calendarUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      toastUI({ title: 'Saved', description: 'Calendar embed URL updated.' });
    } catch (e: any) { toastUI({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-accent" />Team Calendar</CardTitle>
          <CardDescription className="text-xs mt-1">Paste your Google Calendar embed URL to display it on all dashboards</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Input placeholder="https://calendar.google.com/calendar/embed?src=..." value={calendarUrl} onChange={(e) => setCalendarUrl(e.target.value)} />
          <p className="text-xs text-muted-foreground">In Google Calendar → Settings → your calendar → "Integrate calendar" → copy the embed URL.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Calendar URL</Button>
        {calendarUrl && (
          <div className="mt-2 rounded-md overflow-hidden border"><iframe src={calendarUrl} className="w-full border-0" style={{ height: '300px' }} title="Calendar Preview" loading="lazy" /></div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function NotificationRouting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage notification routing and scheduled report settings.</p>
      </div>

      {/* Notification routing cards */}
      <NotificationCards />

      {/* Canvasser EOD Report — right after notifications */}
      <CanvasserEODCard />

      {/* Other report settings */}
      <ScheduledReportCard />
      <CalendarCard />
    </div>
  );
}
