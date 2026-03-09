import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Save, Calendar as CalendarIcon, TrendingUp, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { SectionCarousel } from '@/components/dashboard/SectionCarousel';

interface UserMetric {
  user_id: string;
  display_name: string | null;
  sales: number;
  leads: number;
  closed_deals: number;
  earnings_ytd: number;
  points: number;
}

interface WeeklyEntry {
  userId: string;
  displayName: string;
  weeklyLeads: string;
  weeklyClosedDeals: string;
  weeklyEarnings: string;
  weeklySelfGeneratedDeals: string;
  weeklyCanvassLeads: string;
  weeklyCanvassDealsClose: string;
  weeklyCollections: string;
  weeklyApprovedRevenue: string;
}

interface CanvasserMetric {
  user_id: string;
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  income: number;
  conversations_had?: number;
  not_interested?: number;
  leads_without_damage?: number;
  hours_worked?: number;
}

interface CanvasserWeeklyEntry {
  userId: string;
  displayName: string;
  weeklyLeadsSet: string;
  weeklyLeadsClosed: string;
  weeklyLeadsWithDamage: string;
  weeklyLeadsWithoutDamage: string;
  weeklyConversationsHad: string;
  weeklyNotInterested: string;
  weeklyCancelledLeads: string;
  weeklyHoursWorked: string;
  weeklyIncome: string;
  weeklyDoorsKnocked: string;
}

interface SupplementerMetricEntry {
  user_id: string;
  display_name: string | null;
}

interface SupplementerWeeklyEntry {
  userId: string;
  displayName: string;
  weeklySupplementsCompleted: string;
  weeklyRcvIncreased: string;
  weeklyMoneyCollected: string;
}

const calculatePoints = (revenue: number, closedDeals: number, collections: number): number => {
  const revenuePoints = Math.floor(revenue / 10000) * 10;
  const closedDealPoints = closedDeals * 10;
  const collectionsPoints = Math.floor(collections / 10000) * 15;
  return revenuePoints + closedDealPoints + collectionsPoints;
};

const calculateSupplementerPoints = (rcv: number, collected: number, cocBonus: number): number => {
  return Math.floor(rcv / 1000) + Math.floor(collected / 2000) + cocBonus;
};

export default function WeeklyUpdates() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserMetric[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [canvassers, setCanvassers] = useState<CanvasserMetric[]>([]);
  const [canvasserEntries, setCanvasserEntries] = useState<CanvasserWeeklyEntry[]>([]);
  const [supplementers, setSupplementers] = useState<SupplementerMetricEntry[]>([]);
  const [supplementerEntries, setSupplementerEntries] = useState<SupplementerWeeklyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeSection, setActiveSection] = useState<string | null>('sales-reps');
  const toggleSection = (id: string) => setActiveSection(prev => prev === id ? null : id);

  const getWeekRangeForDate = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    return { weekStart, weekEnd };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
      const canvasserUserIds = new Set(rolesData?.filter(r => r.role === 'canvasser').map(r => r.user_id) || []);
      const { data: profilesData } = await supabase.from('profiles').select('id, is_archived');
      const archivedUserIds = new Set(profilesData?.filter(p => p.is_archived).map(p => p.id) || []);

      const { data: salesData, error: salesError } = await supabase
        .from('user_metrics').select('user_id, display_name, sales, leads, closed_deals, earnings_ytd, points').order('display_name', { ascending: true });
      if (salesError) throw salesError;

      const uniqueUsers = new Map<string, UserMetric>();
      (salesData || []).forEach((item) => {
        if (item.user_id && !uniqueUsers.has(item.user_id) && !canvasserUserIds.has(item.user_id) && !archivedUserIds.has(item.user_id)) {
          uniqueUsers.set(item.user_id, item as UserMetric);
        }
      });
      const userList = Array.from(uniqueUsers.values());
      setUsers(userList);
      setWeeklyEntries(userList.map((user) => ({
        userId: user.user_id, displayName: user.display_name || 'Unknown',
        weeklyLeads: '', weeklyClosedDeals: '', weeklyEarnings: '',
        weeklySelfGeneratedDeals: '', weeklyCanvassLeads: '', weeklyCanvassDealsClose: '',
        weeklyCollections: '', weeklyApprovedRevenue: '',
      })));

      const { data: canvasserData, error: canvasserError } = await supabase
        .from('canvasser_metrics').select('user_id, display_name, leads_set, leads_closed, leads_with_damage, shifts_worked, income').order('display_name', { ascending: true });
      if (canvasserError) throw canvasserError;

      const uniqueCanvassers = new Map<string, CanvasserMetric>();
      (canvasserData || []).forEach((item) => {
        if (item.user_id && !uniqueCanvassers.has(item.user_id) && !archivedUserIds.has(item.user_id) && canvasserUserIds.has(item.user_id)) {
          uniqueCanvassers.set(item.user_id, item as CanvasserMetric);
        }
      });
      const canvasserList = Array.from(uniqueCanvassers.values());
      setCanvassers(canvasserList);
      setCanvasserEntries(canvasserList.map((canvasser) => ({
        userId: canvasser.user_id, displayName: canvasser.display_name || 'Unknown',
        weeklyLeadsSet: '', weeklyLeadsClosed: '', weeklyLeadsWithDamage: '',
        weeklyLeadsWithoutDamage: '', weeklyConversationsHad: '', weeklyNotInterested: '',
        weeklyCancelledLeads: '', weeklyHoursWorked: '', weeklyIncome: '', weeklyDoorsKnocked: '',
      })));

      const { data: suppRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'supplementer');
      const suppUserIds = new Set(suppRoles?.map(r => r.user_id) || []);
      const { data: suppData } = await supabase.from('supplementer_metrics').select('user_id, display_name').order('display_name', { ascending: true });
      const uniqueSupps = new Map<string, SupplementerMetricEntry>();
      (suppData || []).forEach((item) => {
        if (item.user_id && !uniqueSupps.has(item.user_id) && !archivedUserIds.has(item.user_id) && suppUserIds.has(item.user_id)) {
          uniqueSupps.set(item.user_id, item);
        }
      });
      const suppList = Array.from(uniqueSupps.values());
      setSupplementers(suppList);
      setSupplementerEntries(suppList.map((s) => ({
        userId: s.user_id, displayName: s.display_name || 'Unknown',
        weeklySupplementsCompleted: '', weeklyRcvIncreased: '', weeklyMoneyCollected: '',
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateEntry = (userId: string, field: keyof WeeklyEntry, value: string) => {
    setWeeklyEntries((prev) => prev.map((entry) => entry.userId === userId ? { ...entry, [field]: value } : entry));
  };

  const updateCanvasserEntry = (userId: string, field: keyof CanvasserWeeklyEntry, value: string) => {
    setCanvasserEntries((prev) => prev.map((entry) => entry.userId === userId ? { ...entry, [field]: value } : entry));
  };

  const updateSupplementerEntry = (userId: string, field: keyof SupplementerWeeklyEntry, value: string) => {
    setSupplementerEntries((prev) => prev.map((entry) => entry.userId === userId ? { ...entry, [field]: value } : entry));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const { weekStart, weekEnd } = getWeekRangeForDate(selectedDate);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const entry of weeklyEntries) {
        const weeklyLeads = parseInt(entry.weeklyLeads) || 0;
        const weeklyClosedDeals = parseInt(entry.weeklyClosedDeals) || 0;
        const weeklyEarnings = parseFloat(entry.weeklyEarnings) || 0;
        const weeklySelfGeneratedDeals = parseInt(entry.weeklySelfGeneratedDeals) || 0;
        const weeklyCanvassLeads = parseInt(entry.weeklyCanvassLeads) || 0;
        const weeklyCanvassDealsClose = parseInt(entry.weeklyCanvassDealsClose) || 0;
        const weeklyCollections = parseFloat(entry.weeklyCollections) || 0;
        const weeklyApprovedRevenue = parseFloat(entry.weeklyApprovedRevenue) || 0;

        if (weeklyLeads === 0 && weeklyClosedDeals === 0 && weeklyEarnings === 0 && 
            weeklySelfGeneratedDeals === 0 && weeklyCanvassLeads === 0 && 
            weeklyCanvassDealsClose === 0 && weeklyCollections === 0 && weeklyApprovedRevenue === 0) continue;

        const weeklyPoints = calculatePoints(weeklyApprovedRevenue, weeklyClosedDeals, weeklyCollections);

        const { data: currentMetrics, error: fetchError } = await supabase
          .from('user_metrics').select('*').eq('user_id', entry.userId).order('created_at', { ascending: false }).limit(1).single();

        if (fetchError) { errorCount++; continue; }

        const newLeads = (Number(currentMetrics.leads) || 0) + weeklyLeads;
        const newClosedDeals = (Number(currentMetrics.closed_deals) || 0) + weeklyClosedDeals;
        const newEarnings = (Number(currentMetrics.earnings_ytd) || 0) + weeklyEarnings;
        const newPoints = (Number(currentMetrics.points) || 0) + weeklyPoints;
        const newSelfGeneratedDeals = (Number(currentMetrics.self_generated_deals) || 0) + weeklySelfGeneratedDeals;
        const newCanvassLeads = (Number((currentMetrics as any).canvass_leads) || 0) + weeklyCanvassLeads;
        const newCanvassDealsClose = (Number((currentMetrics as any).canvass_deals_closed) || 0) + weeklyCanvassDealsClose;
        const newCollections = (Number((currentMetrics as any).collections) || 0) + weeklyCollections;
        const newApprovedRevenue = (Number((currentMetrics as any).approved_revenue) || 0) + weeklyApprovedRevenue;

        const { error: updateError } = await supabase.from('user_metrics').update({
          leads: newLeads, closed_deals: newClosedDeals, earnings_ytd: newEarnings,
          points: newPoints, self_generated_deals: newSelfGeneratedDeals,
          canvass_leads: newCanvassLeads, canvass_deals_closed: newCanvassDealsClose,
          collections: newCollections, approved_revenue: newApprovedRevenue,
          updated_at: new Date().toISOString(),
        }).eq('user_id', entry.userId);

        if (updateError) { errorCount++; continue; }

        const { data: existingWeekly } = await supabase.from('weekly_user_metrics').select('*').eq('user_id', entry.userId).eq('week_start', weekStartStr).maybeSingle();

        const compoundedWeekly = {
          user_id: entry.userId, week_start: weekStartStr, week_end: weekEndStr,
          leads: (Number(existingWeekly?.leads) || 0) + weeklyLeads,
          closed_deals: (Number(existingWeekly?.closed_deals) || 0) + weeklyClosedDeals,
          earnings: (Number(existingWeekly?.earnings) || 0) + weeklyEarnings,
          canvass_leads: (Number(existingWeekly?.canvass_leads) || 0) + weeklyCanvassLeads,
          canvass_deals_closed: (Number(existingWeekly?.canvass_deals_closed) || 0) + weeklyCanvassDealsClose,
          collections: (Number(existingWeekly?.collections) || 0) + weeklyCollections,
          approved_revenue: (Number(existingWeekly?.approved_revenue) || 0) + weeklyApprovedRevenue,
          points_earned: calculatePoints(
            (Number(existingWeekly?.approved_revenue) || 0) + weeklyApprovedRevenue,
            (Number(existingWeekly?.closed_deals) || 0) + weeklyClosedDeals,
            (Number(existingWeekly?.collections) || 0) + weeklyCollections
          ),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('weekly_user_metrics').upsert(compoundedWeekly, { onConflict: 'user_id,week_start' });
        successCount++;
      }

      for (const entry of canvasserEntries) {
        const weeklyLeadsSet = parseInt(entry.weeklyLeadsSet) || 0;
        const weeklyLeadsClosed = parseInt(entry.weeklyLeadsClosed) || 0;
        const weeklyLeadsWithDamage = parseInt(entry.weeklyLeadsWithDamage) || 0;
        const weeklyLeadsWithoutDamage = parseInt(entry.weeklyLeadsWithoutDamage) || 0;
        const weeklyConversationsHad = parseInt(entry.weeklyConversationsHad) || 0;
        const weeklyNotInterested = parseInt(entry.weeklyNotInterested) || 0;
        const weeklyCancelledLeads = parseInt(entry.weeklyCancelledLeads) || 0;
        const weeklyHoursWorked = parseFloat(entry.weeklyHoursWorked) || 0;
        const weeklyIncome = parseFloat(entry.weeklyIncome) || 0;
        const weeklyDoorsKnocked = parseInt(entry.weeklyDoorsKnocked) || 0;

        if (weeklyLeadsSet === 0 && weeklyLeadsClosed === 0 && weeklyLeadsWithDamage === 0 && 
            weeklyLeadsWithoutDamage === 0 && weeklyConversationsHad === 0 && weeklyNotInterested === 0 &&
            weeklyCancelledLeads === 0 && weeklyHoursWorked === 0 && weeklyIncome === 0 && weeklyDoorsKnocked === 0) continue;

        const { data: currentMetrics, error: fetchError } = await supabase
          .from('canvasser_metrics').select('*').eq('user_id', entry.userId).order('created_at', { ascending: false }).limit(1).single();
        if (fetchError) { errorCount++; continue; }

        const { error: updateError } = await supabase.from('canvasser_metrics').update({
          leads_set: (Number(currentMetrics.leads_set) || 0) + weeklyLeadsSet,
          leads_closed: (Number(currentMetrics.leads_closed) || 0) + weeklyLeadsClosed,
          leads_with_damage: (Number(currentMetrics.leads_with_damage) || 0) + weeklyLeadsWithDamage,
          leads_without_damage: (Number((currentMetrics as any).leads_without_damage) || 0) + weeklyLeadsWithoutDamage,
          conversations_had: (Number((currentMetrics as any).conversations_had) || 0) + weeklyConversationsHad,
          not_interested: (Number((currentMetrics as any).not_interested) || 0) + weeklyNotInterested,
          cancelled_leads: (Number((currentMetrics as any).cancelled_leads) || 0) + weeklyCancelledLeads,
          hours_worked: (Number((currentMetrics as any).hours_worked) || 0) + weeklyHoursWorked,
          income: (Number(currentMetrics.income) || 0) + weeklyIncome,
          doors_knocked: (Number((currentMetrics as any).doors_knocked) || 0) + weeklyDoorsKnocked,
          updated_at: new Date().toISOString(),
        } as any).eq('user_id', entry.userId);
        if (updateError) { errorCount++; continue; }

        const { data: existingCanvasserWeekly } = await supabase.from('weekly_canvasser_metrics').select('*').eq('user_id', entry.userId).eq('week_start', weekStartStr).maybeSingle();
        const compoundedLeadsClosed = (Number(existingCanvasserWeekly?.leads_closed) || 0) + weeklyLeadsClosed;
        const compoundedLeadsWithDamage = (Number(existingCanvasserWeekly?.leads_with_damage) || 0) + weeklyLeadsWithDamage;
        const compoundedLeadsSet = (Number(existingCanvasserWeekly?.leads_set) || 0) + weeklyLeadsSet;
        const canvasserPoints = (compoundedLeadsClosed * 10) + (compoundedLeadsWithDamage * 5) + compoundedLeadsSet;

        await supabase.from('weekly_canvasser_metrics').upsert({
          user_id: entry.userId, week_start: weekStartStr, week_end: weekEndStr,
          leads_set: compoundedLeadsSet, leads_closed: compoundedLeadsClosed,
          leads_with_damage: compoundedLeadsWithDamage,
          leads_without_damage: (Number(existingCanvasserWeekly?.leads_without_damage) || 0) + weeklyLeadsWithoutDamage,
          conversations_had: (Number(existingCanvasserWeekly?.conversations_had) || 0) + weeklyConversationsHad,
          not_interested: (Number(existingCanvasserWeekly?.not_interested) || 0) + weeklyNotInterested,
          cancelled_leads: (Number((existingCanvasserWeekly as any)?.cancelled_leads) || 0) + weeklyCancelledLeads,
          hours_worked: (Number(existingCanvasserWeekly?.hours_worked) || 0) + weeklyHoursWorked,
          income: (Number(existingCanvasserWeekly?.income) || 0) + weeklyIncome,
          doors_knocked: (Number(existingCanvasserWeekly?.doors_knocked) || 0) + weeklyDoorsKnocked,
          points_earned: canvasserPoints, updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,week_start' });

        const { data: authUser } = await supabase.auth.getUser();
        await supabase.from('daily_canvasser_metric_entries').upsert({
          user_id: entry.userId, entry_date: format(selectedDate, 'yyyy-MM-dd'),
          hours_worked_delta: weeklyHoursWorked, leads_set_delta: weeklyLeadsSet,
          leads_closed_delta: weeklyLeadsClosed, leads_with_damage_delta: weeklyLeadsWithDamage,
          leads_without_damage_delta: weeklyLeadsWithoutDamage, conversations_had_delta: weeklyConversationsHad,
          not_interested_delta: weeklyNotInterested, cancelled_leads_delta: weeklyCancelledLeads,
          doors_knocked_delta: weeklyDoorsKnocked, income_delta: weeklyIncome,
          entered_by: authUser.user?.id, updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,entry_date' });

        successCount++;
      }

      for (const entry of supplementerEntries) {
        const weeklyRcv = parseFloat(entry.weeklyRcvIncreased) || 0;
        const weeklyCollected = parseFloat(entry.weeklyMoneyCollected) || 0;
        const weeklySuppsDone = parseInt(entry.weeklySupplementsCompleted) || 0;
        if (weeklyRcv === 0 && weeklyCollected === 0 && weeklySuppsDone === 0) continue;

        const { data: currentMetrics, error: fetchError } = await supabase
          .from('supplementer_metrics').select('*').eq('user_id', entry.userId).maybeSingle();
        if (fetchError || !currentMetrics) { errorCount++; continue; }

        const newRcv = (Number(currentMetrics.total_rcv_increased) || 0) + weeklyRcv;
        const newCollected = (Number(currentMetrics.total_money_collected) || 0) + weeklyCollected;
        const newSupps = (Number(currentMetrics.total_supplements_processed) || 0) + weeklySuppsDone;
        const cocBonus = Number(currentMetrics.coc_bonus_points) || 0;
        const newPoints = calculateSupplementerPoints(newRcv, newCollected, cocBonus);

        const { error: updateError } = await supabase.from('supplementer_metrics').update({
          total_rcv_increased: newRcv, total_money_collected: newCollected,
          total_supplements_processed: newSupps, points: newPoints,
          collection_rate: newRcv > 0 ? Math.round((newCollected / newRcv) * 10000) / 100 : 0,
          updated_at: new Date().toISOString(),
        }).eq('user_id', entry.userId);
        if (updateError) { errorCount++; continue; }

        const { data: existingWeekly } = await supabase.from('weekly_supplementer_metrics').select('*').eq('user_id', entry.userId).eq('week_start', weekStartStr).maybeSingle();
        const compoundedRcv = (Number(existingWeekly?.rcv_increased) || 0) + weeklyRcv;
        const compoundedCollected = (Number(existingWeekly?.money_collected) || 0) + weeklyCollected;
        const compoundedSupps = (Number(existingWeekly?.supplements_completed) || 0) + weeklySuppsDone;
        const weeklyPts = Math.floor(compoundedRcv / 1000) + Math.floor(compoundedCollected / 2000);

        await supabase.from('weekly_supplementer_metrics').upsert({
          user_id: entry.userId, week_start: weekStartStr, week_end: weekEndStr,
          display_name: entry.displayName, rcv_increased: compoundedRcv,
          money_collected: compoundedCollected, supplements_completed: compoundedSupps,
          points_earned: weeklyPts, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,week_start' });

        successCount++;
      }

      if (successCount > 0) {
        toast({ title: 'Weekly Updates Saved', description: `Successfully updated ${successCount} user(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}. Points auto-calculated.` });
        setWeeklyEntries((prev) => prev.map((entry) => ({ ...entry, weeklyLeads: '', weeklyClosedDeals: '', weeklyEarnings: '', weeklySelfGeneratedDeals: '', weeklyCanvassLeads: '', weeklyCanvassDealsClose: '', weeklyCollections: '', weeklyApprovedRevenue: '' })));
        setCanvasserEntries((prev) => prev.map((entry) => ({ ...entry, weeklyLeadsSet: '', weeklyLeadsClosed: '', weeklyLeadsWithDamage: '', weeklyLeadsWithoutDamage: '', weeklyConversationsHad: '', weeklyNotInterested: '', weeklyCancelledLeads: '', weeklyHoursWorked: '', weeklyIncome: '', weeklyDoorsKnocked: '' })));
      } else if (errorCount > 0) {
        toast({ title: 'Error', description: `Failed to update ${errorCount} user(s)`, variant: 'destructive' });
      } else {
        toast({ title: 'No Changes', description: 'No weekly data was entered to save' });
      }
    } catch (error) {
      console.error('Error saving weekly updates:', error);
      toast({ title: 'Error', description: 'Failed to save weekly updates', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const { weekStart, weekEnd } = getWeekRangeForDate(selectedDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Daily Updates</h1>
          <p className="text-sm text-muted-foreground">Enter daily numbers for each team member</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
          
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-5 w-5 text-accent" />
            Entry for {format(selectedDate, 'MMM d, yyyy')} (Week: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')})
          </CardTitle>
          <CardDescription>
            Enter the daily numbers for each team member. These will be added to their weekly and yearly totals. 
            <span className="font-medium text-accent"> Points are auto-calculated based on role.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SectionCarousel activeSection={activeSection} onToggle={toggleSection}>
            <SectionCarousel.Item id="sales-reps" title={`Sales Reps (${users.length})`} icon={TrendingUp}>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No sales reps found. Invite users first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hidden lg:grid lg:grid-cols-9 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <div>Team Member</div><div>Approved Rev</div><div>Leads</div>
                    <div>Total Contracts</div><div>Self-Gen Contracts</div><div>Canvass Leads</div>
                    <div>Canvass Contracts</div><div>Collections</div><div>Earnings ($)</div>
                  </div>
                  {weeklyEntries.map((entry) => (
                    <div key={entry.userId} className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-9 lg:gap-2 lg:items-center p-4 lg:p-0 bg-muted/30 lg:bg-transparent rounded-lg lg:rounded-none">
                      <div className="font-medium text-foreground text-sm">{entry.displayName}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 lg:contents">
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Approved Rev</Label><Input type="number" min="0" step="0.01" placeholder="0.00" value={entry.weeklyApprovedRevenue} onChange={(e) => updateEntry(entry.userId, 'weeklyApprovedRevenue', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Leads</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyLeads} onChange={(e) => updateEntry(entry.userId, 'weeklyLeads', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Total Contracts</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyClosedDeals} onChange={(e) => updateEntry(entry.userId, 'weeklyClosedDeals', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Self-Gen Contracts</Label><Input type="number" min="0" placeholder="0" value={entry.weeklySelfGeneratedDeals} onChange={(e) => updateEntry(entry.userId, 'weeklySelfGeneratedDeals', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Canvass Leads</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyCanvassLeads} onChange={(e) => updateEntry(entry.userId, 'weeklyCanvassLeads', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Canvass Contracts</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyCanvassDealsClose} onChange={(e) => updateEntry(entry.userId, 'weeklyCanvassDealsClose', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Collections</Label><Input type="number" min="0" step="0.01" placeholder="0.00" value={entry.weeklyCollections} onChange={(e) => updateEntry(entry.userId, 'weeklyCollections', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Earnings ($)</Label><Input type="number" min="0" step="0.01" placeholder="0.00" value={entry.weeklyEarnings} onChange={(e) => updateEntry(entry.userId, 'weeklyEarnings', e.target.value)} className="h-8 text-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCarousel.Item>

            <SectionCarousel.Item id="canvassers" title={`Canvassers (${canvassers.length})`} icon={Users}>
              {canvassers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No canvassers found. Invite canvassers first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hidden lg:grid lg:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <div>Team Member</div><div>Leads Set</div><div>Leads Closed</div>
                    <div>w/ Damage</div><div>w/o Damage</div><div>Convos</div>
                    <div>Not Int.</div><div>Canceled</div><div>Hours</div>
                    <div>Doors</div><div>Income ($)</div>
                  </div>
                  {canvasserEntries.map((entry) => (
                    <div key={entry.userId} className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-2 lg:items-center p-4 lg:p-0 bg-muted/30 lg:bg-transparent rounded-lg lg:rounded-none">
                      <div className="font-medium text-foreground text-sm">{entry.displayName}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 lg:contents">
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Leads Set</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyLeadsSet} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsSet', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Leads Closed</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyLeadsClosed} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsClosed', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">w/ Damage</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyLeadsWithDamage} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsWithDamage', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">w/o Damage</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyLeadsWithoutDamage} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyLeadsWithoutDamage', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Convos Had</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyConversationsHad} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyConversationsHad', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Not Interested</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyNotInterested} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyNotInterested', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Canceled</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyCancelledLeads} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyCancelledLeads', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Hours Worked</Label><Input type="number" min="0" step="0.5" placeholder="0" value={entry.weeklyHoursWorked} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyHoursWorked', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Doors Knocked</Label><Input type="number" min="0" placeholder="0" value={entry.weeklyDoorsKnocked} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyDoorsKnocked', e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground lg:hidden">Income ($)</Label><Input type="number" min="0" step="0.01" placeholder="0.00" value={entry.weeklyIncome} onChange={(e) => updateCanvasserEntry(entry.userId, 'weeklyIncome', e.target.value)} className="h-8 text-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCarousel.Item>
          </SectionCarousel>
        </CardContent>
      </Card>

      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Select a date and enter the daily numbers for each team member</li>
                <li>Click "Save All" to add these numbers to their weekly and yearly totals</li>
                <li><strong>Points are auto-calculated:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li><strong>Sales Reps:</strong> 10 points per $10,000 approved revenue + 10 points per closed deal + 15 points per $10,000 collections</li>
                    <li><strong>Canvassers:</strong> 10 pts per lead closed, 5 pts per lead with damage, 1 pt per lead set</li>
                  </ul>
                </li>
                <li>Weekly data is tracked separately for contest periods</li>
                <li>The leaderboard and contests will update automatically</li>
                <li>You can go back and update any date if needed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
