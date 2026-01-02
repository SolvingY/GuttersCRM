import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Calendar, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format, subWeeks, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { CanvasserActiveContestWidget } from "@/components/canvasser/CanvasserActiveContestWidget";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';
import { 
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, Line
} from 'recharts';

interface CanvasserMetrics {
  display_name: string | null;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  points: number;
  income: number;
  yearly_goal: number;
}

interface WeeklyCanvasserMetric {
  week_start: string;
  week_end: string;
  leads_set: number;
  leads_closed: number;
  leads_with_damage: number;
  shifts_worked: number;
  income: number;
  points_earned: number;
}

export default function CanvasserStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CanvasserMetrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyCanvasserMetric[]>([]);
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyCanvasserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Collapsible section states - matching sales rep order
  const [openSections, setOpenSections] = useState({
    contests: true,
    stats: true,
    weeklyUpdates: true,
    fiscalProgress: true,
    goalProgress: true,
    weeklyChart: true,
  });

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

    // Fetch YTD metrics
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

    // Fetch weekly metrics (last 8 weeks for Recent Weekly Updates)
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

    // Fetch all weekly metrics from fiscal year start
    const fiscalStartStr = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');
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

  // Goal calculations
  const yearlyGoal = metrics?.yearly_goal || 0;
  const leadsClosed = metrics?.leads_closed || 0;
  const goalPercentage = yearlyGoal > 0 ? (leadsClosed / yearlyGoal) * 100 : 0;
  const amountRemaining = Math.max(0, yearlyGoal - leadsClosed);

  // Fiscal year progress
  const fiscalYearProgress = getFiscalYearProgress();
  const daysRemaining = getDaysRemainingInFiscalYear();

  // Get color based on goal percentage
  const getGoalColor = () => {
    if (goalPercentage >= 75) return 'text-green-600';
    if (goalPercentage >= 50) return 'text-yellow-600';
    if (goalPercentage >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  // Prepare 52-week fiscal year progression data for leads closed (bar chart)
  // Uses calendar-aligned weeks (Monday-Sunday) to match how weekly data is stored
  const get52WeekData = () => {
    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const now = new Date();
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; leadsClosed: number | null; goalPace: number; cumulativeGoal: number }[] = [];
    
    // Get the Monday of the week containing fiscal year start
    const firstWeekStart = startOfWeek(fiscalStart, { weekStartsOn: 1 });
    
    // Always show all 52 weeks
    for (let i = 0; i < 52; i++) {
      const weekStart = addWeeks(firstWeekStart, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      // Check if this week is in the future
      const isFutureWeek = weekStart > now;
      
      // Match by comparing date strings to avoid timezone issues
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weeklyMetric = allWeeklyMetrics.find(w => w.week_start === weekStartStr);
      
      weeks.push({
        week: `W${i + 1}`,
        weekLabel: format(weekStart, 'MMM d'),
        leadsClosed: isFutureWeek ? null : (Number(weeklyMetric?.leads_closed) || 0),
        goalPace: weeklyGoalPace,
        cumulativeGoal: weeklyGoalPace * (i + 1),
      });
    }
    
    let cumulative = 0;
    return weeks.map(w => {
      if (w.leadsClosed !== null) {
        cumulative += w.leadsClosed;
      }
      return { ...w, cumulativeLeadsClosed: w.leadsClosed === null ? null : cumulative };
    });
  };

  return (
    <div className="space-y-6 min-w-0 w-full">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track your canvassing performance</p>
      </div>

      {/* 1. Active Contests Widget */}
      <Collapsible open={openSections.contests} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, contests: open }))}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  🏆 Active Contests
                </CardTitle>
                {openSections.contests ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <CanvasserActiveContestWidget />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 2. Key Metrics (includes leads, shifts, income, points) */}
      <Collapsible open={openSections.stats} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, stats: open }))}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Key Metrics
                </CardTitle>
                {openSections.stats ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Leads Set</span>
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{metrics?.leads_set ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total appointments scheduled</p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Leads Closed</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{metrics?.leads_closed ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Successful conversions</p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Leads with Damage</span>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{metrics?.leads_with_damage ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Properties with confirmed damage</p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Shifts Worked</span>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{metrics?.shifts_worked ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total shifts completed</p>
                </div>

                <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Total Income</span>
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(metrics?.income ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Earnings from activities</p>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Total Points</span>
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {metrics?.points?.toLocaleString() ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Points earned</p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Conversion Rate</span>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary">{conversionRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.leads_closed ?? 0} / {metrics?.leads_set ?? 0} leads closed
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Damage Detection</span>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-500">{damageRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.leads_with_damage ?? 0} / {metrics?.leads_set ?? 0} with damage
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 3. Recent Weekly Updates */}
      {weeklyMetrics.length > 0 && (
        <Collapsible open={openSections.weeklyUpdates} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, weeklyUpdates: open }))}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Recent Weekly Updates
                  </CardTitle>
                  {openSections.weeklyUpdates ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </div>
                <CardDescription>Points: 10 per lead closed, 5 per lead with damage, 1 per lead set</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
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
                          <span>{week.shifts_worked} shifts</span>
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 4. Fiscal Year Progress */}
      <Collapsible open={openSections.fiscalProgress} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, fiscalProgress: open }))}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Fiscal Year Progress
                </CardTitle>
                {openSections.fiscalProgress ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Dec 15, 2025 - Dec 15, 2026
                  </span>
                  <span className="font-medium text-foreground">
                    {daysRemaining} days remaining
                  </span>
                </div>
                <Progress value={fiscalYearProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {fiscalYearProgress.toFixed(1)}% of fiscal year complete
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 5. Goal Progress */}
      {yearlyGoal > 0 && (
        <Collapsible open={openSections.goalProgress} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, goalProgress: open }))}>
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-primary" />
                    Goal Progress
                  </CardTitle>
                  {openSections.goalProgress ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Yearly Goal</p>
                      <p className="text-2xl font-bold text-foreground">{yearlyGoal} leads</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Current</p>
                      <p className="text-2xl font-bold text-foreground">{leadsClosed} leads</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={`font-semibold ${getGoalColor()}`}>
                        {goalPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(goalPercentage, 100)} className="h-3" />
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Leads Remaining</p>
                    <p className="text-lg font-semibold text-foreground">{amountRemaining} leads to go</p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 6. 52-Week Progress Chart - AT THE BOTTOM */}
      {yearlyGoal > 0 && (
        <Collapsible open={openSections.weeklyChart} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, weeklyChart: open }))}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    52-Week Progress (Fiscal Year Dec 15 - Dec 15)
                  </CardTitle>
                  {openSections.weeklyChart ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </div>
                <CardDescription>Track your leads closed progress week by week</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={get52WeekData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="week" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        interval={7}
                        angle={-45}
                        textAnchor="end"
                        height={50}
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
                        formatter={(value: number, name: string) => {
                          const labelMap: Record<string, string> = {
                            'leadsClosed': 'Weekly Leads Closed',
                            'cumulativeLeadsClosed': 'Cumulative',
                            'cumulativeGoal': 'Goal Pace'
                          };
                          return [value.toLocaleString(), labelMap[name] || name];
                        }}
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
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
