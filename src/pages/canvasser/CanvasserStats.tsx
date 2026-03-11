import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Info, ChevronDown, ChevronRight, Star, Calendar, Percent, Quote, Users, GitCompare, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SectionCarousel } from "@/components/dashboard/SectionCarousel";
import { format, subWeeks } from "date-fns";
import { FISCAL_YEAR } from "@/lib/constants";
import { CanvasserActiveContestWidget } from "@/components/canvasser/CanvasserActiveContestWidget";
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar
} from 'recharts';
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getRandomQuote } from "@/lib/motivationalQuotes";
import { CanvasserConversionFunnel } from "@/components/canvasser/CanvasserConversionFunnel";
import { CanvasserYTDRankingWidget } from "@/components/canvasser/CanvasserYTDRankingWidget";
import { TimeClockWidget } from "@/components/canvasser/TimeClockWidget";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GoogleCalendarWidget } from "@/components/dashboard/GoogleCalendarWidget";
import { AssignedZonesWidget } from "@/components/canvasser/AssignedZonesWidget";

interface CanvasserMetrics {
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  leads_without_damage: number;
  conversations_had: number;
  not_interested: number;
  hours_worked: number;
  doors_knocked: number;
  points: number;
  income: number;
  yearly_goal: number;
  leads_set_goal: number;
  income_goal: number;
}

interface WeeklyCanvasserMetric {
  week_start: string;
  week_end: string;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  leads_without_damage: number;
  conversations_had: number;
  not_interested: number;
  hours_worked: number;
  income: number;
  points_earned: number;
}

export default function CanvasserStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CanvasserMetrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyCanvasserMetric[]>([]);
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyCanvasserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [quote] = useState(getRandomQuote());
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (id: string) => setOpenSection(prev => prev === id ? null : id);
  const [canvassedLeads, setCanvassedLeads] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchMetrics();

    // Realtime: refetch when canvasser_metrics row for this user changes
    const channel = supabase
      .channel(`canvasser-metrics-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'canvasser_metrics',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchMetrics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

    // Fetch config fields (display_name, goals) from canvasser_metrics
    const { data: configData } = await supabase
      .from("canvasser_metrics")
      .select("display_name, yearly_goal, leads_set_goal, income_goal, contest_points, wager_points")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Aggregate performance data from daily entries (fiscal year)
    const fiscalStartStr = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');
    const { data: dailyEntries, error: dailyError } = await supabase
      .from("daily_canvasser_metric_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("entry_date", fiscalStartStr);

    if (dailyError) {
      console.error("Error fetching daily entries:", dailyError);
    }

    const summed = (dailyEntries || []).reduce((acc, e) => ({
      leads_set: acc.leads_set + (e.leads_set_delta || 0),
      leads_closed: acc.leads_closed + (e.leads_closed_delta || 0),
      leads_with_damage: acc.leads_with_damage + (e.leads_with_damage_delta || 0),
      leads_without_damage: acc.leads_without_damage + (e.leads_without_damage_delta || 0),
      conversations_had: acc.conversations_had + (e.conversations_had_delta || 0),
      not_interested: acc.not_interested + (e.not_interested_delta || 0),
      hours_worked: acc.hours_worked + Number(e.hours_worked_delta || 0),
      doors_knocked: acc.doors_knocked + (e.doors_knocked_delta || 0),
    }), {
      leads_set: 0, leads_closed: 0, leads_with_damage: 0, leads_without_damage: 0,
      conversations_had: 0, not_interested: 0, hours_worked: 0, doors_knocked: 0,
    });

    setMetrics({
      display_name: configData?.display_name || null,
      yearly_goal: configData?.yearly_goal || 0,
      leads_set_goal: configData?.leads_set_goal || 0,
      income_goal: configData?.income_goal || 0,
      points: configData?.points || 0,
      income: configData?.income || 0,
      leads_set: summed.leads_set,
      leads_closed: summed.leads_closed,
      leads_with_damage: summed.leads_with_damage,
      leads_without_damage: summed.leads_without_damage,
      conversations_had: summed.conversations_had,
      not_interested: summed.not_interested,
      hours_worked: summed.hours_worked,
      doors_knocked: summed.doors_knocked,
    });

    const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('weekly_canvasser_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', eightWeeksAgo)
      .order('week_start', { ascending: false });

    if (weeklyError) {
      console.error('Error fetching weekly metrics:', weeklyError);
    } else {
      setWeeklyMetrics(weeklyData || []);
    }

    const fiscalStart = new Date(2025, 11, 15);
    const fiscalStartStr2 = format(fiscalStart, 'yyyy-MM-dd');
    const { data: allWeeklyData, error: allWeeklyError } = await supabase
      .from('weekly_canvasser_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', fiscalStartStr2)
      .order('week_start', { ascending: true });

    if (allWeeklyError) {
      console.error('Error fetching all weekly metrics:', allWeeklyError);
    } else {
      setAllWeeklyMetrics(allWeeklyData || []);
    }

    const { data: leadsData } = await supabase
      .from("quote_requests")
      .select("id, full_name, service_type, status, quote_amount, created_at")
      .eq("canvasser_id", user.id)
      .order("created_at", { ascending: false });
    setCanvassedLeads(leadsData || []);

    const { data: shiftsData } = await supabase
      .from("canvasser_shifts")
      .select("*")
      .eq("canvasser_id", user.id)
      .order("clock_in_at", { ascending: false })
      .limit(20);
    setShifts(shiftsData || []);

    const { data: revenueData } = await supabase
      .from("quote_requests")
      .select("quote_amount")
      .eq("canvasser_id", user.id)
      .in("status", ["won", "scheduled", "completed"]);
    const revenue = (revenueData || []).reduce((sum: number, l: any) => sum + (Number(l.quote_amount) || 0), 0);
    setTotalRevenue(revenue);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const conversionRate = metrics && metrics.leads_set > 0 
    ? ((metrics.leads_closed / metrics.leads_set) * 100).toFixed(1)
    : "0.0";

  const damageRate = metrics && metrics.leads_set > 0
    ? ((metrics.leads_with_damage / metrics.leads_set) * 100).toFixed(1)
    : "0.0";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const fiscalStart = new Date(2025, 11, 15);
  const fiscalEnd = new Date(2026, 11, 15);
  const now = new Date();
  const totalFiscalDays = Math.floor((fiscalEnd.getTime() - fiscalStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - fiscalStart.getTime()) / (1000 * 60 * 60 * 24)));
  const fiscalYearProgress = Math.min(100, (daysElapsed / totalFiscalDays) * 100);
  const daysRemaining = Math.max(0, totalFiscalDays - daysElapsed);

  const get52WeekData = () => {
    const yearlyGoal = metrics?.yearly_goal || 0;
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; leadsClosed: number; goalPace: number; cumulativeGoal: number }[] = [];
    
    for (let i = 0; i < 52; i++) {
      const weekStart = new Date(fiscalStart);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weeklyMetric = allWeeklyMetrics.find(w => w.week_start === weekStartStr);
      
      weeks.push({
        week: `W${i + 1}`,
        weekLabel: format(weekStart, 'MMM d'),
        leadsClosed: Number(weeklyMetric?.leads_closed) || 0,
        goalPace: weeklyGoalPace,
        cumulativeGoal: weeklyGoalPace * (i + 1),
      });
    }
    
    let cumulative = 0;
    return weeks.map(w => {
      cumulative += w.leadsClosed;
      return { ...w, cumulativeLeadsClosed: cumulative };
    });
  };

  const yearlyGoal = metrics?.yearly_goal || 0;
  const leadsClosed = metrics?.leads_closed || 0;
  const goalPercentage = yearlyGoal > 0 ? (leadsClosed / yearlyGoal) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
        <CardContent className="py-4">
          <div className="flex gap-3 items-start">
            <Quote className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm italic text-foreground">"{quote.quote}"</p>
              <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Stats</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}! Track your canvassing performance
        </p>
      </div>

      <AssignedZonesWidget />

      <TimeClockWidget onShiftChange={fetchMetrics} />

      <SectionCarousel activeSection={openSection} onToggle={toggleSection}>
        <SectionCarousel.Item id="shifts" title="Recent Shifts" icon={Clock}>
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No shifts recorded yet</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>In</TableHead>
                      <TableHead>Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Doors</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift: any) => (
                      <TableRow key={shift.id} className={shift.status === 'flagged' ? 'bg-yellow-500/10' : ''}>
                        <TableCell className="whitespace-nowrap text-sm">{format(new Date(shift.clock_in_at), "MMM d")}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{format(new Date(shift.clock_in_at), "h:mm a")}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {shift.clock_out_at
                            ? format(new Date(shift.clock_out_at), "h:mm a")
                            : shift.status === 'flagged'
                              ? <span className="text-yellow-600">⚠️ Flagged</span>
                              : <span className="text-green-600">In Progress</span>
                          }
                        </TableCell>
                        <TableCell className="text-sm">{shift.hours_worked != null ? `${shift.hours_worked}h` : '—'}</TableCell>
                        <TableCell className="text-sm">{shift.doors_knocked || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{shift.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground border-t pt-3">
                <span>
                  This Week: {shifts
                    .filter((s: any) => { const d = new Date(s.clock_in_at); const n = new Date(); const w = new Date(n); w.setDate(w.getDate() - 7); return d >= w && s.hours_worked != null; })
                    .reduce((sum: number, s: any) => sum + Number(s.hours_worked || 0), 0).toFixed(1)} hrs
                </span>
                <span>
                  This Month: {shifts
                    .filter((s: any) => { const d = new Date(s.clock_in_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && s.hours_worked != null; })
                    .reduce((sum: number, s: any) => sum + Number(s.hours_worked || 0), 0).toFixed(1)} hrs
                </span>
              </div>
            </>
          )}
        </SectionCarousel.Item>

        <SectionCarousel.Item id="contests" title="Contests" icon={Target}>
          <CanvasserActiveContestWidget />
        </SectionCarousel.Item>

        <SectionCarousel.Item id="ranking" title="YTD Rankings" icon={TrendingUp}>
          <CanvasserYTDRankingWidget />
        </SectionCarousel.Item>

        <SectionCarousel.Item id="metrics" title="Key Metrics" icon={Star}>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Leads Set" value={metrics?.leads_set ?? 0} icon={Target} />
            <StatsCard title="Leads Closed" value={metrics?.leads_closed ?? 0} icon={CheckCircle} />
            <StatsCard title="Leads with Damage" value={metrics?.leads_with_damage ?? 0} icon={AlertTriangle} />
            <StatsCard title="Leads w/o Damage" value={metrics?.leads_without_damage ?? 0} icon={Target} />
            <StatsCard title="Conversations Had" value={metrics?.conversations_had ?? 0} icon={Users} />
            <StatsCard title="Canceled Lead" value={metrics?.not_interested ?? 0} icon={AlertTriangle} />
            <StatsCard title="Hours Worked" value={metrics?.hours_worked ?? 0} icon={Clock} />
            <StatsCard title="Points" value={metrics?.points?.toLocaleString() ?? 0} icon={Star} />
            <StatsCard title="YTD Income" value={formatCurrency(metrics?.income ?? 0)} icon={DollarSign} valueClassName="text-green-500" />
            <StatsCard title="Conversion Rate" value={`${conversionRate}%`} icon={Percent} />
            <StatsCard title="Damage Rate" value={`${damageRate}%`} icon={AlertTriangle} />
            <StatsCard title="💰 Revenue Generated" value={formatCurrency(totalRevenue)} icon={DollarSign} valueClassName="text-green-500" />
          </div>
        </SectionCarousel.Item>

        <SectionCarousel.Item id="funnel" title="Conversion Funnel" icon={GitCompare}>
          <CanvasserConversionFunnel 
            data={{
              doorsKnocked: metrics?.doors_knocked || 0,
              conversationsHad: metrics?.conversations_had || 0,
              leadsSet: metrics?.leads_set || 0,
              leadsWithDamage: metrics?.leads_with_damage || 0,
              leadsWithoutDamage: metrics?.leads_without_damage || 0,
              leadsClosed: metrics?.leads_closed || 0,
            }} 
          />
        </SectionCarousel.Item>

        <SectionCarousel.Item id="canvassed-leads" title="My Leads" icon={ClipboardList}>
          {canvassedLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No canvassed leads yet</p>
          ) : (
            <div className="space-y-2">
              {canvassedLeads.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{lead.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{lead.service_type?.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.quote_amount && <span className="text-sm font-medium">${Number(lead.quote_amount).toLocaleString()}</span>}
                    <Badge variant="outline" className="capitalize text-[10px]">{lead.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCarousel.Item>

        <SectionCarousel.Item id="weekly" title="Weekly Updates" icon={TrendingUp}>
          {weeklyMetrics.length > 0 ? (
            <div className="space-y-3">
              {weeklyMetrics.slice(0, 4).map((week) => (
                <div key={week.week_start} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Week of {format(new Date(week.week_start), 'MMM d')} - {format(new Date(week.week_end), 'MMM d')}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{week.leads_set} leads set</span>
                      <span>{week.leads_closed} closed</span>
                      <span>{week.hours_worked || 0} hours</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(Number(week.income))}</p>
                    {week.points_earned > 0 && <p className="text-xs text-primary">+{Number(week.points_earned)} pts</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No weekly data yet</p>
          )}
        </SectionCarousel.Item>

        <SectionCarousel.Item id="fiscal" title="Fiscal Year" icon={Calendar}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dec 15, 2025 - Dec 15, 2026</span>
              <span className="font-medium text-foreground">{daysRemaining} days remaining</span>
            </div>
            <Progress value={fiscalYearProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{fiscalYearProgress.toFixed(1)}% of fiscal year complete</p>
          </div>
        </SectionCarousel.Item>

        <SectionCarousel.Item id="goal" title="Goal Progress" icon={Target}>
          <div className="space-y-4">
            {yearlyGoal > 0 && (
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Contracts Signed From Leads</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold text-primary">{leadsClosed}</span>
                      <span className="text-xl text-muted-foreground"> / {yearlyGoal}</span>
                    </div>
                    <span className="text-xl font-semibold text-foreground">{goalPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(goalPercentage, 100)} className="h-2" />
                </CardContent>
              </Card>
            )}
            {(metrics?.leads_set_goal || 0) > 0 && (
              <Card className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Leads Set Goal</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold text-blue-500">{metrics?.leads_set || 0}</span>
                      <span className="text-xl text-muted-foreground"> / {metrics?.leads_set_goal || 0}</span>
                    </div>
                    <span className="text-xl font-semibold text-foreground">
                      {((metrics?.leads_set || 0) / (metrics?.leads_set_goal || 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(((metrics?.leads_set || 0) / (metrics?.leads_set_goal || 1) * 100), 100)} className="h-2" />
                </CardContent>
              </Card>
            )}
            {(metrics?.income_goal || 0) > 0 && (
              <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">Income Goal</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold text-green-500">{formatCurrency(metrics?.income || 0)}</span>
                      <span className="text-xl text-muted-foreground"> / {formatCurrency(metrics?.income_goal || 0)}</span>
                    </div>
                    <span className="text-xl font-semibold text-foreground">
                      {((metrics?.income || 0) / (metrics?.income_goal || 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(((metrics?.income || 0) / (metrics?.income_goal || 1) * 100), 100)} className="h-2" />
                </CardContent>
              </Card>
            )}
            {yearlyGoal === 0 && (metrics?.leads_set_goal || 0) === 0 && (metrics?.income_goal || 0) === 0 && (
              <p className="text-center text-muted-foreground py-4">No goals set yet</p>
            )}
          </div>
        </SectionCarousel.Item>

        <SectionCarousel.Item id="progress" title="52-Week Progress" icon={TrendingUp}>
          {yearlyGoal > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={get52WeekData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={3} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [value.toLocaleString(), name === 'leadsClosed' ? 'Weekly Leads Closed' : name === 'cumulativeLeadsClosed' ? 'Cumulative' : 'Goal Pace']}
                    labelFormatter={(label, payload) => payload?.[0] ? `Week of ${payload[0].payload.weekLabel}` : label}
                  />
                  <Legend />
                  <Bar dataKey="leadsClosed" fill="hsl(var(--primary))" name="Weekly Leads Closed" radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="cumulativeLeadsClosed" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Cumulative" />
                  <Line type="monotone" dataKey="cumulativeGoal" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Goal Pace" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Set a yearly goal to see progress</p>
          )}
        </SectionCarousel.Item>
      </SectionCarousel>

      <GoogleCalendarWidget />
    </div>
  );
}
