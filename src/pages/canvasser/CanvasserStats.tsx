import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Info, ChevronDown, ChevronRight, Star, Calendar, Percent, Quote, Users, GitCompare, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AccordionButton } from "@/components/dashboard/AccordionButton";
import { format, subWeeks } from "date-fns";
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
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("canvasser_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching metrics:", error);
    } else {
      setMetrics(data);
    }

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
    const fiscalStartStr = format(fiscalStart, 'yyyy-MM-dd');
    const { data: allWeeklyData, error: allWeeklyError } = await supabase
      .from('weekly_canvasser_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', fiscalStartStr)
      .order('week_start', { ascending: true });

    if (allWeeklyError) {
      console.error('Error fetching all weekly metrics:', allWeeklyError);
    } else {
      setAllWeeklyMetrics(allWeeklyData || []);
    }

    // Fetch canvassed leads
    const { data: leadsData } = await supabase
      .from("quote_requests")
      .select("id, full_name, service_type, status, quote_amount, created_at")
      .eq("canvasser_id", user.id)
      .order("created_at", { ascending: false });
    setCanvassedLeads(leadsData || []);

    // Fetch shifts
    const { data: shiftsData } = await supabase
      .from("canvasser_shifts")
      .select("*")
      .eq("canvasser_id", user.id)
      .order("clock_in_at", { ascending: false })
      .limit(20);
    setShifts(shiftsData || []);

    // Fetch revenue from closed leads
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

  // Fiscal year progress (Dec 15, 2025 - Dec 15, 2026)
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
      
      // Format as yyyy-MM-dd string for comparison (avoids UTC/local timezone issues)
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      // Compare week_start strings directly to avoid date parsing issues
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
      {/* Motivational Quote Banner */}
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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          My Stats
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}! Track your canvassing performance
        </p>
      </div>

      {/* Time Clock Widget — always visible */}
      <TimeClockWidget onShiftChange={fetchMetrics} />

      <AccordionButton id="shifts" title="My Recent Shifts" icon={Clock} isOpen={openSection === "shifts"} onToggle={toggleSection}>
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
                          <TableRow
                            key={shift.id}
                            className={shift.status === 'flagged' ? 'bg-yellow-500/10' : ''}
                          >
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(shift.clock_in_at), "MMM d")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(shift.clock_in_at), "h:mm a")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {shift.clock_out_at
                                ? format(new Date(shift.clock_out_at), "h:mm a")
                                : shift.status === 'flagged'
                                  ? <span className="text-yellow-600">⚠️ Flagged</span>
                                  : <span className="text-green-600">In Progress</span>
                              }
                            </TableCell>
                            <TableCell className="text-sm">
                              {shift.hours_worked != null ? `${shift.hours_worked}h` : '—'}
                            </TableCell>
                            <TableCell className="text-sm">{shift.doors_knocked || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                              {shift.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground border-t pt-3">
                    <span>
                      This Week: {shifts
                        .filter((s: any) => {
                          const d = new Date(s.clock_in_at);
                          const now = new Date();
                          const weekAgo = new Date(now);
                          weekAgo.setDate(weekAgo.getDate() - 7);
                          return d >= weekAgo && s.hours_worked != null;
                        })
                        .reduce((sum: number, s: any) => sum + Number(s.hours_worked || 0), 0)
                        .toFixed(1)} hrs
                    </span>
                    <span>
                      This Month: {shifts
                        .filter((s: any) => {
                          const d = new Date(s.clock_in_at);
                          const now = new Date();
                          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && s.hours_worked != null;
                        })
                        .reduce((sum: number, s: any) => sum + Number(s.hours_worked || 0), 0)
                        .toFixed(1)} hrs
                    </span>
                  </div>
          </>
        )}
      </AccordionButton>

      {/* 1. Contests */}
      <AccordionButton id="contests" title="Contests" icon={Target} isOpen={openSection === "contests"} onToggle={toggleSection}>
        <CanvasserActiveContestWidget />
      </AccordionButton>

      {/* 2. YTD Point Rankings */}
      <AccordionButton id="ranking" title="YTD Point Rankings" icon={TrendingUp} isOpen={openSection === "ranking"} onToggle={toggleSection}>
        <CanvasserYTDRankingWidget />
      </AccordionButton>

      {/* 3. Key Metrics */}
      <AccordionButton id="metrics" title="Key Metrics" icon={Star} isOpen={openSection === "metrics"} onToggle={toggleSection}>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Leads Set" value={metrics?.leads_set ?? 0} icon={Target} />
            <StatsCard title="Leads Closed" value={metrics?.leads_closed ?? 0} icon={CheckCircle} />
            <StatsCard title="Leads with Damage" value={metrics?.leads_with_damage ?? 0} icon={AlertTriangle} />
            <StatsCard title="Leads w/o Damage" value={metrics?.leads_without_damage ?? 0} icon={Target} />
            <StatsCard title="Conversations Had" value={metrics?.conversations_had ?? 0} icon={Users} />
            <StatsCard title="Canceled Lead" value={metrics?.not_interested ?? 0} icon={AlertTriangle} />
            <StatsCard title="Hours Worked" value={metrics?.hours_worked ?? 0} icon={Clock} />
            <StatsCard title="Points" value={metrics?.points?.toLocaleString() ?? 0} icon={Star} />
            <StatsCard 
              title="YTD Income" 
              value={formatCurrency(metrics?.income ?? 0)} 
              icon={DollarSign}
              valueClassName="text-green-500"
            />
            <StatsCard title="Conversion Rate" value={`${conversionRate}%`} icon={Percent} />
            <StatsCard title="Damage Rate" value={`${damageRate}%`} icon={AlertTriangle} />
            <StatsCard 
              title="💰 Revenue Generated" 
              value={formatCurrency(totalRevenue)} 
              icon={DollarSign}
              valueClassName="text-green-500"
            />
        </div>
      </AccordionButton>

      {/* Conversion Funnel */}
      <AccordionButton id="funnel" title="Conversion Funnel" icon={GitCompare} isOpen={openSection === "funnel"} onToggle={toggleSection}>
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
      </AccordionButton>

      {/* My Canvassed Leads */}
      <AccordionButton id="canvassed-leads" title="My Canvassed Leads" icon={ClipboardList} isOpen={openSection === "canvassed-leads"} onToggle={toggleSection}>
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
                        {lead.quote_amount && (
                          <span className="text-sm font-medium">${Number(lead.quote_amount).toLocaleString()}</span>
                        )}
                        <Badge variant="outline" className="capitalize text-[10px]">{lead.status}</Badge>
                      </div>
                    </div>
                  ))}
          </div>
        )}
      </AccordionButton>

      {/* 4. Recent Weekly Updates */}
      {weeklyMetrics.length > 0 && (
        <AccordionButton id="weekly" title="Recent Weekly Updates" icon={TrendingUp} isOpen={openSection === "weekly"} onToggle={toggleSection}>
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
                        {week.points_earned > 0 && (
                          <p className="text-xs text-primary">+{Number(week.points_earned)} pts</p>
                        )}
                      </div>
                    </div>
                  ))}
          </div>
        </AccordionButton>
      )}

      {/* 4. Fiscal Year Progress */}
      <AccordionButton id="fiscal" title="Fiscal Year Progress" icon={Calendar} isOpen={openSection === "fiscal"} onToggle={toggleSection}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dec 15, 2025 - Dec 15, 2026</span>
            <span className="font-medium text-foreground">{daysRemaining} days remaining</span>
          </div>
          <Progress value={fiscalYearProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {fiscalYearProgress.toFixed(1)}% of fiscal year complete
          </p>
        </div>
      </AccordionButton>

      {/* 5. Goal Progress */}
      {(yearlyGoal > 0 || (metrics?.leads_set_goal || 0) > 0 || (metrics?.income_goal || 0) > 0) && (
        <AccordionButton id="goal" title="Goal Progress" icon={Target} isOpen={openSection === "goal"} onToggle={toggleSection}>
          <div className="space-y-4">
              {/* Contracts Goal */}
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
                      <span className="text-xl font-semibold text-foreground">
                        {goalPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(goalPercentage, 100)} className="h-2" />
                  </CardContent>
                </Card>
              )}

              {/* Leads Set Goal */}
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
                    <Progress 
                      value={Math.min(((metrics?.leads_set || 0) / (metrics?.leads_set_goal || 1) * 100), 100)} 
                      className="h-2" 
                    />
                  </CardContent>
                </Card>
              )}

              {/* Income Goal */}
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
                    <Progress 
                      value={Math.min(((metrics?.income || 0) / (metrics?.income_goal || 1) * 100), 100)} 
                      className="h-2" 
                    />
                  </CardContent>
                </Card>
              )}
          </div>
        </AccordionButton>
      )}

      {/* 6. 52-Week Progress */}
      {yearlyGoal > 0 && (
        <AccordionButton id="progress" title="52-Week Progress" icon={TrendingUp} isOpen={openSection === "progress"} onToggle={toggleSection}>
          <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={get52WeekData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="week" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        interval={3}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString(),
                          name === 'leadsClosed' ? 'Weekly Leads Closed' : name === 'cumulativeLeadsClosed' ? 'Cumulative' : 'Goal Pace'
                        ]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `Week of ${payload[0].payload.weekLabel}`;
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="leadsClosed"
                        fill="hsl(var(--primary))"
                        name="Weekly Leads Closed"
                        radius={[2, 2, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulativeLeadsClosed"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={false}
                        name="Cumulative"
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulativeGoal"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Goal Pace"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      <GoogleCalendarWidget />
    </div>
  );
}
