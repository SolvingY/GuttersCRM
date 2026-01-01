import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format, subWeeks } from "date-fns";
import { CanvasserActiveContestWidget } from "@/components/canvasser/CanvasserActiveContestWidget";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  
  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    contests: true,
    goal: true,
    stats: true,
    weeklyUpdates: true,
    performance: true,
    income: true,
    chart: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

    // Fetch all weekly metrics from fiscal year start (Dec 15, 2025)
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

  // Prepare 52-week fiscal year progression data for leads closed (bar chart)
  const get52WeekData = () => {
    const yearlyGoal = metrics?.yearly_goal || 0;
    const fiscalStart = new Date(2025, 11, 15);
    const now = new Date();
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; leadsClosed: number; goalPace: number; cumulativeGoal: number }[] = [];
    
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeekNum = Math.ceil((now.getTime() - fiscalStart.getTime()) / msPerWeek);
    const weeksToShow = Math.max(Math.min(currentWeekNum + 2, 52), 4);
    
    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = new Date(fiscalStart);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      const weeklyMetric = allWeeklyMetrics.find(w => {
        const wStart = new Date(w.week_start);
        return wStart >= weekStart && wStart < new Date(weekStart.getTime() + msPerWeek);
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

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    section,
    iconColor = "text-primary",
    description 
  }: { 
    title: string; 
    icon: React.ElementType; 
    isOpen: boolean; 
    section: keyof typeof openSections;
    iconColor?: string;
    description?: string;
  }) => (
    <CollapsibleTrigger asChild>
      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => toggleSection(section)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            {title}
          </CardTitle>
          {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back{metrics?.display_name ? `, ${metrics.display_name}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">Track your canvassing performance</p>
      </div>

      {/* Active Contests Widget */}
      <Collapsible open={openSections.contests} onOpenChange={() => toggleSection('contests')}>
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

      {/* Yearly Goal Progress */}
      {metrics?.yearly_goal && metrics.yearly_goal > 0 && (
        <Collapsible open={openSections.goal} onOpenChange={() => toggleSection('goal')}>
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <SectionHeader
              title="Yearly Goal Progress"
              icon={Target}
              isOpen={openSections.goal}
              section="goal"
            />
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <CardDescription>
                  {metrics.leads_closed >= metrics.yearly_goal
                    ? "🎉 Congratulations! You've reached your goal!"
                    : `${metrics.yearly_goal - metrics.leads_closed} leads closed to go`}
                </CardDescription>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-4xl font-bold text-primary">{metrics.leads_closed}</span>
                    <span className="text-2xl text-muted-foreground"> / {metrics.yearly_goal}</span>
                  </div>
                  <span className="text-2xl font-semibold text-foreground">
                    {((metrics.leads_closed / metrics.yearly_goal) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min((metrics.leads_closed / metrics.yearly_goal) * 100, 100)} 
                  className="h-3"
                />
                <p className="text-sm text-muted-foreground">
                  Leads closed this year towards your annual target
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Main Stats Grid */}
      <Collapsible open={openSections.stats} onOpenChange={() => toggleSection('stats')}>
        <Card>
          <SectionHeader
            title="Key Metrics"
            icon={TrendingUp}
            isOpen={openSections.stats}
            section="stats"
          />
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
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Weekly Updates Section */}
      {weeklyMetrics.length > 0 && (
        <Collapsible open={openSections.weeklyUpdates} onOpenChange={() => toggleSection('weeklyUpdates')}>
          <Card>
            <SectionHeader
              title="Recent Weekly Updates"
              icon={TrendingUp}
              isOpen={openSections.weeklyUpdates}
              section="weeklyUpdates"
              description="Points: 10 per lead closed, 5 per lead with damage, 1 per lead set"
            />
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

      {/* Performance Metrics */}
      <Collapsible open={openSections.performance} onOpenChange={() => toggleSection('performance')}>
        <Card>
          <SectionHeader
            title="Performance Metrics"
            icon={TrendingUp}
            isOpen={openSections.performance}
            section="performance"
          />
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  <h4 className="text-lg font-medium">Conversion Rate</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold text-primary">{conversionRate}%</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics?.leads_closed ?? 0} / {metrics?.leads_set ?? 0} leads
                    </span>
                  </div>
                  <Progress value={Number(conversionRate)} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Percentage of leads set that resulted in closed deals
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  <h4 className="text-lg font-medium">Damage Detection Rate</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold text-yellow-500">{damageRate}%</span>
                    <span className="text-sm text-muted-foreground">
                      {metrics?.leads_with_damage ?? 0} / {metrics?.leads_set ?? 0} leads
                    </span>
                  </div>
                  <Progress value={Number(damageRate)} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Percentage of leads with confirmed property damage
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Income and Points Row */}
      <Collapsible open={openSections.income} onOpenChange={() => toggleSection('income')}>
        <Card>
          <SectionHeader
            title="Income & Points"
            icon={DollarSign}
            isOpen={openSections.income}
            section="income"
            iconColor="text-green-500"
          />
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-medium">Total Income</h4>
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(metrics?.income ?? 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Earnings from all canvassing activities
                  </p>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-2">Total Points</h4>
                  <div className="text-4xl font-bold text-primary">
                    {metrics?.points?.toLocaleString() ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Points earned from all activities
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 52-Week Fiscal Year Bar Chart - AT THE BOTTOM */}
      {metrics?.yearly_goal && metrics.yearly_goal > 0 && (
        <Collapsible open={openSections.chart} onOpenChange={() => toggleSection('chart')}>
          <Card>
            <SectionHeader
              title="52-Week Progress (Fiscal Year Dec 15 - Dec 15)"
              icon={TrendingUp}
              isOpen={openSections.chart}
              section="chart"
              description="Track your leads closed progress week by week"
            />
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
