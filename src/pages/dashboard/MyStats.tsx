import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActiveContestWidget } from '@/components/dashboard/ActiveContestWidget';
import { DollarSign, Star, Briefcase, Target, Loader2, Wallet, Calendar, Calculator, Percent, Users, TrendingUp, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { 
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, Line 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';
import { format, subWeeks, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

interface UserMetric {
  id: string;
  sales: number;
  points: number;
  leads: number;
  closed_deals: number;
  metric_date: string;
  yearly_goal: number;
  sales_rank: string;
  earnings_ytd: number;
  self_generated_deals: number;
}

interface WeeklyMetric {
  week_start: string;
  week_end: string;
  sales: number;
  leads: number;
  closed_deals: number;
  earnings: number;
  points_earned: number;
}



export default function MyStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    contests: true,
    stats: true,
    weeklyUpdates: true,
    fiscalProgress: true,
    goalProgress: true,
    weeklyChart: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (!user) return;

    const fetchMetrics = async () => {
      // Fetch YTD metrics
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('metric_date', { ascending: true })
        .limit(90);

      if (error) {
        console.error('Error fetching metrics:', error);
      } else {
        setMetrics(data || []);
      }

      // Fetch weekly metrics (last 8 weeks for Recent Weekly Updates)
      const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_user_metrics')
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
      const fiscalStartStr = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');
      const { data: allWeeklyData, error: allWeeklyError } = await supabase
        .from('weekly_user_metrics')
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

    fetchMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const latestMetric = metrics[metrics.length - 1];
  const previousMetric = metrics[metrics.length - 2];

  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return undefined;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      isPositive: change >= 0,
    };
  };

  // Calculate goal progress
  const yearlyGoal = Number(latestMetric?.yearly_goal) || 0;
  const currentSales = Number(latestMetric?.sales) || 0;
  const earningsYtd = Number(latestMetric?.earnings_ytd) || 0;
  const goalPercentage = yearlyGoal > 0 ? (currentSales / yearlyGoal) * 100 : 0;
  const amountRemaining = Math.max(0, yearlyGoal - currentSales);

  // Calculate average job size and lead to close %
  const closedDeals = Number(latestMetric?.closed_deals) || 0;
  const leads = Number(latestMetric?.leads) || 0;
  const selfGeneratedDeals = Number(latestMetric?.self_generated_deals) || 0;
  const averageJobSize = closedDeals > 0 ? currentSales / closedDeals : 0;
  // Lead to close % excludes self-generated deals
  const dealsFromLeads = Math.max(0, closedDeals - selfGeneratedDeals);
  const leadToCloseRate = leads > 0 ? (dealsFromLeads / leads) * 100 : 0;

  // Color coding functions
  const getLeadToCloseColor = (rate: number) => {
    if (rate >= 60) return 'text-green-500';
    if (rate >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAvgJobSizeColor = (size: number) => {
    if (size >= 25000) return 'text-green-500';
    if (size >= 20000) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Fiscal year progress
  const fiscalYearProgress = getFiscalYearProgress();
  const daysRemaining = getDaysRemainingInFiscalYear();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };


  // Prepare 52-week fiscal year progression data (bar chart)
  // Uses calendar-aligned weeks (Monday-Sunday) to match how weekly data is stored
  const get52WeekData = () => {
    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const now = new Date();
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; sales: number | null; goalPace: number; cumulativeGoal: number }[] = [];
    
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
        sales: isFutureWeek ? null : (Number(weeklyMetric?.sales) || 0),
        goalPace: weeklyGoalPace,
        cumulativeGoal: weeklyGoalPace * (i + 1),
      });
    }
    
    let cumulative = 0;
    return weeks.map(w => {
      if (w.sales !== null) {
        cumulative += w.sales;
      }
      return { ...w, cumulativeSales: w.sales === null ? null : cumulative };
    });
  };

  

  // Get color based on goal percentage
  const getGoalColor = () => {
    if (goalPercentage >= 75) return 'text-green-600';
    if (goalPercentage >= 50) return 'text-yellow-600';
    if (goalPercentage >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    iconColor = "text-accent",
    description 
  }: { 
    title: string; 
    icon: React.ElementType; 
    isOpen: boolean; 
    iconColor?: string;
    description?: string;
  }) => (
    <CollapsibleTrigger asChild>
      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
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
    <div className="space-y-6 min-w-0 w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading text-foreground">My Stats</h2>
        <p className="text-sm text-muted-foreground">Track your personal performance metrics</p>
      </div>

      {metrics.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No metrics data available yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your performance data will appear here once it's synced.
          </p>
        </div>
      ) : (
        <>
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
                  <ActiveContestWidget />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Stats Cards */}
          <Collapsible open={openSections.stats} onOpenChange={() => toggleSection('stats')}>
            <Card>
              <SectionHeader
                title="Key Metrics"
                icon={TrendingUp}
                isOpen={openSections.stats}
              />
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Row 1: Total Sales & Avg Job Size */}
                    <StatsCard
                      title="Total Sales"
                      value={formatCurrency(currentSales)}
                      icon={DollarSign}
                      trend={previousMetric ? calculateTrend(Number(latestMetric?.sales), Number(previousMetric?.sales)) : undefined}
                    />
                    <StatsCard
                      title="Avg Job Size"
                      value={formatCurrency(averageJobSize)}
                      icon={Calculator}
                      valueClassName={getAvgJobSizeColor(averageJobSize)}
                    />
                    
                    {/* Row 2: Points & YTD Earnings */}
                    <StatsCard
                      title="Points"
                      value={Number(latestMetric?.points || 0).toLocaleString()}
                      icon={Star}
                      trend={previousMetric ? calculateTrend(Number(latestMetric?.points), Number(previousMetric?.points)) : undefined}
                    />
                    <StatsCard
                      title="YTD Earnings"
                      value={formatCurrency(earningsYtd)}
                      icon={Wallet}
                      valueClassName="text-green-600 dark:text-green-400"
                      className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20"
                    />
                    
                    {/* Row 3: Closed Deals & Leads */}
                    <StatsCard
                      title="Closed Deals"
                      value={latestMetric?.closed_deals || 0}
                      icon={Briefcase}
                      trend={previousMetric ? calculateTrend(latestMetric?.closed_deals || 0, previousMetric?.closed_deals || 0) : undefined}
                    />
                    <StatsCard
                      title="Leads"
                      value={leads.toLocaleString()}
                      icon={Users}
                      trend={previousMetric ? calculateTrend(leads, Number(previousMetric?.leads) || 0) : undefined}
                    />
                    
                    {/* Row 4: Lead to Close % & Self Generated Deals */}
                    <StatsCard
                      title="Lead to Close %"
                      value={`${leadToCloseRate.toFixed(1)}%`}
                      icon={Percent}
                      valueClassName={getLeadToCloseColor(leadToCloseRate)}
                    />
                    <StatsCard
                      title="Self Generated Deals"
                      value={selfGeneratedDeals}
                      icon={UserCheck}
                    />
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
                              <span>{week.leads} leads</span>
                              <span>{week.closed_deals} closed</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{formatCurrency(Number(week.sales))}</p>
                            <p className="text-xs text-accent">+{Number(week.points_earned)} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Fiscal Year Progress */}
          <Collapsible open={openSections.fiscalProgress} onOpenChange={() => toggleSection('fiscalProgress')}>
            <Card>
              <SectionHeader
                title="Fiscal Year Progress"
                icon={Calendar}
                isOpen={openSections.fiscalProgress}
              />
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

          {/* Goal Progress Card */}
          {yearlyGoal > 0 && (
            <Collapsible open={openSections.goalProgress} onOpenChange={() => toggleSection('goalProgress')}>
              <Card>
                <SectionHeader
                  title="Goal Progress"
                  icon={Target}
                  isOpen={openSections.goalProgress}
                />
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Yearly Goal</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrency(yearlyGoal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Current Sales</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrency(currentSales)}</p>
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

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Amount Remaining</p>
                          <p className="text-lg font-semibold text-foreground">{formatCurrency(amountRemaining)}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Rank</p>
                          <p className="text-lg font-semibold text-foreground">{latestMetric?.sales_rank || 'SR1'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}


          {/* 52-Week Fiscal Year Bar Chart - AT THE BOTTOM */}
          {yearlyGoal > 0 && (
            <Collapsible open={openSections.weeklyChart} onOpenChange={() => toggleSection('weeklyChart')}>
              <Card>
                <SectionHeader
                  title="52-Week Progress (Fiscal Year Dec 15 - Dec 15)"
                  icon={TrendingUp}
                  isOpen={openSections.weeklyChart}
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
                            interval={7}
                            angle={-45}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => {
                              const labelMap: Record<string, string> = {
                                'sales': 'Weekly Sales',
                                'cumulativeSales': 'Cumulative Sales',
                                'cumulativeGoal': 'Goal Pace'
                              };
                              return [formatCurrency(value), labelMap[name] || name];
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
                            dataKey="sales"
                            fill="hsl(var(--accent))"
                            name="Weekly Sales"
                            radius={[2, 2, 0, 0]}
                          />
                          <Line
                            type="monotone"
                            dataKey="cumulativeSales"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            name="Cumulative Sales"
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
        </>
      )}
    </div>
  );
}
