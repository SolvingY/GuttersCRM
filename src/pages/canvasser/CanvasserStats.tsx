import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Info, ChevronDown, ChevronRight, Star, Calendar, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, subWeeks } from "date-fns";
import { CanvasserActiveContestWidget } from "@/components/canvasser/CanvasserActiveContestWidget";
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar
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
  
  // Collapsible states
  const [contestsOpen, setContestsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [fiscalOpen, setFiscalOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

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
      
      const weeklyMetric = allWeeklyMetrics.find(w => {
        const wStart = new Date(w.week_start);
        return wStart >= weekStart && wStart < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      });
      
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

  const CollapsibleHeader = ({ 
    isOpen, 
    title, 
    icon: Icon 
  }: { 
    isOpen: boolean; 
    title: string; 
    icon: React.ElementType;
  }) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">{title}</span>
      </div>
      {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </div>
  );

  const yearlyGoal = metrics?.yearly_goal || 0;
  const leadsClosed = metrics?.leads_closed || 0;
  const goalPercentage = yearlyGoal > 0 ? (leadsClosed / yearlyGoal) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          My Stats <span className="text-red-500 text-lg ml-2">The 6 Figure System</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}! Track your canvassing performance
        </p>
      </div>

      {/* 1. Contests */}
      <Collapsible open={contestsOpen} onOpenChange={setContestsOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-4">
              <CollapsibleHeader isOpen={contestsOpen} title="Contests" icon={Target} />
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <CanvasserActiveContestWidget />
        </CollapsibleContent>
      </Collapsible>

      {/* 2. Key Metrics (Combined) */}
      <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-4">
              <CollapsibleHeader isOpen={metricsOpen} title="Key Metrics" icon={Star} />
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Leads Set */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leads Set</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{metrics?.leads_set ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total appointments scheduled</p>
              </CardContent>
            </Card>

            {/* Leads Closed */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leads Closed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{metrics?.leads_closed ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Successful conversions</p>
              </CardContent>
            </Card>

            {/* Leads with Damage */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leads with Damage</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{metrics?.leads_with_damage ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Confirmed damage</p>
              </CardContent>
            </Card>

            {/* Shifts Worked */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Shifts Worked</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{metrics?.shifts_worked ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total shifts completed</p>
              </CardContent>
            </Card>

            {/* Points */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Points</CardTitle>
                <Star className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{metrics?.points?.toLocaleString() ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total points earned</p>
              </CardContent>
            </Card>

            {/* YTD Income (Green) */}
            <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">YTD Income</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{formatCurrency(metrics?.income ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Year-to-date earnings</p>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                <Percent className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{metrics?.leads_closed ?? 0} / {metrics?.leads_set ?? 0} leads</p>
              </CardContent>
            </Card>

            {/* Damage Rate */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Damage Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{damageRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{metrics?.leads_with_damage ?? 0} / {metrics?.leads_set ?? 0} leads</p>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 3. Recent Weekly Updates */}
      {weeklyMetrics.length > 0 && (
        <Collapsible open={weeklyOpen} onOpenChange={setWeeklyOpen}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="py-4">
                <CollapsibleHeader isOpen={weeklyOpen} title="Recent Weekly Updates" icon={TrendingUp} />
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  <span>Points: 10 per lead closed, 5 per lead with damage, 1 per lead set</span>
                </CardDescription>
              </CardHeader>
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
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 4. Fiscal Year Progress */}
      <Collapsible open={fiscalOpen} onOpenChange={setFiscalOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="py-4">
              <CollapsibleHeader isOpen={fiscalOpen} title="Fiscal Year Progress" icon={Calendar} />
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card>
            <CardContent className="pt-4">
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
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* 5. Goal Progress */}
      {yearlyGoal > 0 && (
        <Collapsible open={goalOpen} onOpenChange={setGoalOpen}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="py-4">
                <CollapsibleHeader isOpen={goalOpen} title="Goal Progress" icon={Target} />
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardContent className="pt-4 space-y-4">
                <CardDescription>
                  {leadsClosed >= yearlyGoal
                    ? "🎉 Congratulations! You've reached your goal!"
                    : `${yearlyGoal - leadsClosed} leads closed to go`}
                </CardDescription>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-4xl font-bold text-primary">{leadsClosed}</span>
                    <span className="text-2xl text-muted-foreground"> / {yearlyGoal}</span>
                  </div>
                  <span className="text-2xl font-semibold text-foreground">
                    {goalPercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(goalPercentage, 100)} 
                  className="h-3"
                />
                <p className="text-sm text-muted-foreground">
                  Leads closed this year towards your annual target
                </p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 6. 52-Week Progress */}
      {yearlyGoal > 0 && (
        <Collapsible open={progressOpen} onOpenChange={setProgressOpen}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="py-4">
                <CollapsibleHeader isOpen={progressOpen} title="52-Week Progress" icon={TrendingUp} />
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">52-Week Progress (Fiscal Year Dec 15 - Dec 15)</CardTitle>
                <CardDescription>Track your leads closed progress week by week</CardDescription>
              </CardHeader>
              <CardContent>
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
    </div>
  );
}
