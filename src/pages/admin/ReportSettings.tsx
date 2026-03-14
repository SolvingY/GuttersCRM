import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Save, Mail, Calendar, Clock, Send, FileText, X, Globe, BarChart3, CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReportRecipientsSelector from '@/components/shared/ReportRecipientsSelector';

function CalendarSettingsCard() {
  const { toast } = useToast();
  const [calendarUrl, setCalendarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'google_calendar_embed_url')
      .maybeSingle()
      .then(({ data }) => {
        setCalendarUrl(data?.value || '');
        setLoaded(true);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'google_calendar_embed_url', value: calendarUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Calendar embed URL updated.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" />
          Team Calendar
        </CardTitle>
        <CardDescription>
          Paste your Google Calendar embed URL to display it on all dashboards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Google Calendar Embed URL</Label>
          <Input
            placeholder="https://calendar.google.com/calendar/embed?src=..."
            value={calendarUrl}
            onChange={(e) => setCalendarUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            In Google Calendar, go to Settings → your calendar → "Integrate calendar" → copy the embed URL.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Calendar URL
        </Button>
        {calendarUrl && (
          <div className="mt-4 rounded-md overflow-hidden border">
            <iframe src={calendarUrl} className="w-full border-0" style={{ height: '300px' }} title="Calendar Preview" loading="lazy" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ReportSettings {
  scheduled_report_enabled: boolean;
  scheduled_report_frequency: 'weekly' | 'monthly';
  scheduled_report_day: number;
  scheduled_report_recipients: string[];
  include_sales_reps: boolean;
  include_canvassers: boolean;
  include_goals: boolean;
}

export default function ReportSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  
  const [settings, setSettings] = useState<ReportSettings>({
    scheduled_report_enabled: true,
    scheduled_report_frequency: 'weekly',
    scheduled_report_day: 1,
    scheduled_report_recipients: [],
    include_sales_reps: true,
    include_canvassers: true,
    include_goals: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      if (data) {
        const newSettings: Partial<ReportSettings> = {};
        data.forEach(row => {
          const key = row.setting_key as keyof ReportSettings;
          let value = row.setting_value;
          
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
            }
          }
          
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          
          (newSettings as any)[key] = value;
        });
        
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('report_settings')
          .upsert(update, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Report settings have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-scheduled-report', {
        body: { frequency: settings.scheduled_report_frequency },
      });

      if (error) throw error;

      toast({
        title: 'Test Report Sent',
        description: `Report sent to ${data?.recipients || 0} recipient(s).`,
      });
    } catch (error: any) {
      console.error('Error sending test report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test report',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const addRecipient = () => {
    if (newEmail && newEmail.includes('@') && !settings.scheduled_report_recipients.includes(newEmail)) {
      setSettings(prev => ({
        ...prev,
        scheduled_report_recipients: [...prev.scheduled_report_recipients, newEmail],
      }));
      setNewEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setSettings(prev => ({
      ...prev,
      scheduled_report_recipients: prev.scheduled_report_recipients.filter(e => e !== email),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Report Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure scheduled performance reports sent to administrators
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" />
            Scheduled Email Reports
          </CardTitle>
          <CardDescription>
            Automatically send performance reports to administrators on a schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Scheduled Reports</Label>
              <p className="text-sm text-muted-foreground">
                Send automatic performance reports to admins
              </p>
            </div>
            <Switch
              checked={settings.scheduled_report_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, scheduled_report_enabled: checked }))}
            />
          </div>

          {settings.scheduled_report_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Report Frequency
                  </Label>
                  <Select
                    value={settings.scheduled_report_frequency}
                    onValueChange={(value: 'weekly' | 'monthly') => setSettings(prev => ({ ...prev, scheduled_report_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {settings.scheduled_report_frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
                  </Label>
                  <Select
                    value={String(settings.scheduled_report_day)}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, scheduled_report_day: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.scheduled_report_frequency === 'weekly' ? (
                        <>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="0">Sunday</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="1">1st</SelectItem>
                          <SelectItem value="15">15th</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Recipients</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Reports are automatically sent to all admins. Add additional email addresses below.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                  />
                  <Button variant="secondary" onClick={addRecipient}>
                    Add
                  </Button>
                </div>
                {settings.scheduled_report_recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.scheduled_report_recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Report Content
          </CardTitle>
          <CardDescription>
            Choose what to include in the scheduled reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Company Goals Progress</Label>
              <p className="text-sm text-muted-foreground">Revenue and leads progress toward goals</p>
            </div>
            <Switch
              checked={settings.include_goals}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, include_goals: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sales Rep Leaderboard</Label>
              <p className="text-sm text-muted-foreground">Top performers and revenue breakdown</p>
            </div>
            <Switch
              checked={settings.include_sales_reps}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, include_sales_reps: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Canvasser Leaderboard</Label>
              <p className="text-sm text-muted-foreground">Top canvassers and leads breakdown</p>
            </div>
            <Switch
              checked={settings.include_canvassers}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, include_canvassers: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
        <Button 
          variant="outline" 
          onClick={handleSendTestReport} 
          disabled={sending || !settings.scheduled_report_enabled}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Test Report
        </Button>
      </div>

      <CalendarSettingsCard />
      <CanvasserEODSettingsCard />
      <ProductionEODSettingsCard />

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-foreground mb-2">How Scheduled Reports Work</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Reports are sent automatically at 6:00 PM on the selected day</li>
            <li>• All users with admin role receive the report by default</li>
            <li>• Reports include current YTD data and goal progress</li>
            <li>• Use "Send Test Report" to preview the email format</li>
            <li>• The Canvasser EOD report is sent daily at the configured time to selected recipients</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function CanvasserEODSettingsCard() {
  const { toast } = useToast();
  const [sendHour, setSendHour] = useState("21");
  const [frequency, setFrequency] = useState("daily");
  const [selectedRecipients, setSelectedRecipients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<'start' | 'end'>('start');
  const [sendingTest, setSendingTest] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined);
  const [sendingRange, setSendingRange] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('report_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['canvasser_eod_send_hour', 'canvasser_eod_frequency', 'canvasser_eod_recipient_ids']);

      if (data) {
        data.forEach((row) => {
          const val = String(row.setting_value || '');
          if (row.setting_key === 'canvasser_eod_send_hour') setSendHour(val || '21');
          if (row.setting_key === 'canvasser_eod_frequency') setFrequency(val || 'daily');
          if (row.setting_key === 'canvasser_eod_recipient_ids') {
            try {
              const ids = JSON.parse(val);
              if (Array.isArray(ids)) {
                supabase.from('report_recipients' as any).select('id, name, email').in('id', ids).then(({ data: recs }) => {
                  if (recs) setSelectedRecipients(recs as any[]);
                });
              }
            } catch {}
          }
        });
      }
      setLoaded(true);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { setting_key: 'canvasser_eod_send_hour', setting_value: sendHour, updated_at: new Date().toISOString() },
        { setting_key: 'canvasser_eod_frequency', setting_value: frequency, updated_at: new Date().toISOString() },
        { setting_key: 'canvasser_eod_recipient_ids', setting_value: JSON.stringify(selectedRecipients.map(r => r.id)), updated_at: new Date().toISOString() },
      ];
      for (const u of updates) {
        const { error } = await supabase.from('report_settings').upsert(u, { onConflict: 'setting_key' });
        if (error) throw error;
      }
      toast({ title: 'Canvasser EOD settings saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-canvasser-eod-report');
      if (error) throw error;
      toast({ title: 'Test report sent', description: 'Check your inbox for the canvasser EOD report.' });
    } catch (err: any) {
      toast({ title: 'Error sending test', description: err.message, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendDateRange = async () => {
    if (!rangeStart || !rangeEnd) {
      toast({ title: 'Select both dates', variant: 'destructive' });
      return;
    }
    setSendingRange(true);
    try {
      const startStr = format(rangeStart, 'yyyy-MM-dd');
      const endStr = format(rangeEnd, 'yyyy-MM-dd');
      const { data, error } = await supabase.functions.invoke('send-canvasser-eod-report', {
        body: { start_date: startStr, end_date: endStr },
      });
      if (error) throw error;
      toast({
        title: 'Date range report sent',
        description: `Report for ${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d')} sent to ${data?.recipients || 0} recipient(s) with ${data?.canvassers || 0} canvasser(s).`,
      });
      setRangeDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error sending report', description: err.message, variant: 'destructive' });
    } finally {
      setSendingRange(false);
    }
  };

  if (!loaded) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Canvasser EOD Report Settings
          </CardTitle>
          <CardDescription>
            Configure the daily canvasser end-of-day summary email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Send Time (CT)
              </Label>
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
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Frequency
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Weekdays Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recipients</Label>
            <p className="text-xs text-muted-foreground mb-2">Select who receives the daily canvasser EOD report</p>
            <ReportRecipientsSelector
              selected={selectedRecipients}
              onChange={setSelectedRecipients}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save EOD Settings
            </Button>
            <Button variant="outline" onClick={handleSendTest} disabled={sendingTest} size="sm">
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Test Report
            </Button>
            <Button variant="outline" onClick={() => setRangeDialogOpen(true)} size="sm">
              <CalendarRange className="h-4 w-4 mr-2" />
              Send Date Range Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Canvasser Date Range Report</DialogTitle>
            <DialogDescription>
              Select a start and end date to generate and send an aggregated canvasser report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeCalendar === 'start' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCalendar('start')}
                className="w-full"
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                {rangeStart ? format(rangeStart, 'MMM d') : 'Start Date'}
              </Button>
              <Button
                variant={activeCalendar === 'end' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCalendar('end')}
                className="w-full"
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                {rangeEnd ? format(rangeEnd, 'MMM d') : 'End Date'}
              </Button>
            </div>

            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={activeCalendar === 'start' ? rangeStart : rangeEnd}
                onSelect={(date) => {
                  if (activeCalendar === 'start') {
                    setRangeStart(date);
                    setActiveCalendar('end');
                  } else {
                    setRangeEnd(date);
                  }
                }}
                disabled={(date) =>
                  date > new Date() ||
                  (activeCalendar === 'end' && rangeStart ? date < rangeStart : false)
                }
                className={cn("p-3 pointer-events-auto rounded-md border")}
              />
            </div>

            {rangeStart && rangeEnd && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Selected Range:</p>
                <p className="font-medium text-foreground">
                  {format(rangeStart, 'MMM d, yyyy')} – {format(rangeEnd, 'MMM d, yyyy')}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSendDateRange}
              disabled={sendingRange || !rangeStart || !rangeEnd}
            >
              {sendingRange ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductionEODSettingsCard() {
  const { toast } = useToast();
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined);
  const [sendingRange, setSendingRange] = useState(false);

  const handleSendDateRange = async () => {
    if (!rangeStart || !rangeEnd) {
      toast({ title: 'Select both dates', variant: 'destructive' });
      return;
    }
    setSendingRange(true);
    try {
      const startStr = format(rangeStart, 'yyyy-MM-dd');
      const endStr = format(rangeEnd, 'yyyy-MM-dd');
      const { data, error } = await supabase.functions.invoke('send-production-eod-summary', {
        body: { start_date: startStr, end_date: endStr },
      });
      if (error) throw error;
      toast({
        title: 'Production report sent',
        description: `Report for ${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d')} sent with ${data?.contractors || 0} contractor(s).`,
      });
      setRangeDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error sending report', description: err.message, variant: 'destructive' });
    } finally {
      setSendingRange(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Production EOD Report
          </CardTitle>
          <CardDescription>
            Send a manual production daily summary for a specific date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setRangeDialogOpen(true)} size="sm">
            <CalendarRange className="h-4 w-4 mr-2" />
            Send Date Range Report
          </Button>
        </CardContent>
      </Card>

      <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Production Date Range Report</DialogTitle>
            <DialogDescription>
              Select a start and end date to generate and send an aggregated production summary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-sm">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !rangeStart && 'text-muted-foreground')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {rangeStart ? format(rangeStart, 'MMM d, yyyy') : 'Pick start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={rangeStart}
                      onSelect={setRangeStart}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !rangeEnd && 'text-muted-foreground')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {rangeEnd ? format(rangeEnd, 'MMM d, yyyy') : 'Pick end'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={rangeEnd}
                      onSelect={setRangeEnd}
                      disabled={(date) => date > new Date() || (rangeStart ? date < rangeStart : false)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {rangeStart && rangeEnd && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Selected Range:</p>
                <p className="font-medium text-foreground">
                  {format(rangeStart, 'MMM d, yyyy')} – {format(rangeEnd, 'MMM d, yyyy')}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSendDateRange}
              disabled={sendingRange || !rangeStart || !rangeEnd}
            >
              {sendingRange ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
