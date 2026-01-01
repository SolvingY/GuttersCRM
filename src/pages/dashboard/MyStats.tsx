import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActiveContestWidget } from '@/components/dashboard/ActiveContestWidget';
import { DollarSign, Star, Briefcase, Target, Loader2, Wallet, Calendar, Calculator, Percent, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';
import { format, subWeeks } from 'date-fns';

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

type TimeView = 'weekly' | 'monthly';

export default function MyStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState<TimeView>('weekly');

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    contests: true,
    stats: true,
    weeklyUpdates: true,
    fiscalProgress: true,
    goalProgress: true,
    performanceChart: true,
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
  const averageJobSize = closedDeals > 0 ? currentSales / closedDeals : 0;
  const leadToCloseRate = leads > 0 ? (closedDeals / leads) * 100 : 0;

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

  // Prepare weekly chart data (last 8 weeks)
  const getWeeklyData = () => {
    const weeks: { [key: string]: { sales: number; points: number } } = {};
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekKey = `Week ${8 - i}`;
      weeks[weekKey] = { sales: 0, points: 0 };
    }

    metrics.forEach((m) => {
      const metricDate = new Date(m.metric_date);
      const weeksAgo = Math.floor((now.getTime() - metricDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 8) {
        const weekKey = `Week ${8 - weeksAgo}`;
        if (weeks[weekKey]) {
          weeks[weekKey].sales += Number(m.sales) || 0;
          weeks[weekKey].points += Number(m.points) || 0;
        }
      }
    });

    return Object.entries(weeks).map(([week, data]) => ({
      period: week,
      sales: data.sales,
      points: data.points,
    }));
  };

  // Prepare monthly chart data from weekly_user_metrics
  const getMonthlyData = () => {
    const fiscalMonthOrder = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const fiscalMonths: { [key: string]: number } = {};
    fiscalMonthOrder.forEach(month => {
      fiscalMonths[month] = 0;
    });

    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const fiscalEnd = FISCAL_YEAR.CURRENT_YEAR_END;

    allWeeklyMetrics.forEach((w) => {
      const weekStartDate = new Date(w.week_start);
      if (weekStartDate >= fiscalStart && weekStartDate <= fiscalEnd) {
        const monthIndex = weekStartDate.getMonth();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[monthIndex];
        if (fiscalMonths[monthName] !== undefined) {
          fiscalMonths[monthName] += Number(w.sales) || 0;
        }
      }
    });

    let cumulative = 0;
    const monthlyGoalPace = yearlyGoal / 12;
    let goalCumulative = 0;
    
    return fiscalMonthOrder.map((month) => {
      cumulative += fiscalMonths[month];
      goalCumulative += monthlyGoalPace;
      return {
        period: month,
        sales: fiscalMonths[month],
        cumulative,
        goalPace: goalCumulative,
      };
    });
  };

  // Prepare 52-week fiscal year progression data (bar chart)
  const get52WeekData = () => {
    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const now = new Date();
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; sales: number; goalPace: number; cumulativeGoal: number }[] = [];
    
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
        sales: Number(weeklyMetric?.sales) || 0,
        goalPace: weeklyGoalPace,
        cumulativeGoal: weeklyGoalPace * (i + 1),
      });
    }
    
    let cumulative = 0;
    return weeks.map(w => {
      cumulative += w.sales;
      return { ...w, cumulativeSales: cumulative };
    });
  };

  const chartData = timeView === 'weekly' ? getWeeklyData() : getMonthlyData();

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
    section,
    iconColor = "text-accent",
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
        <h2 className="text-2xl font-heading text-foreground">My Stats</h2>
        <p className="text-muted-foreground">Track your personal performance metrics</p>
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
                section="stats"
              />
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatsCard
                      title="Total Sales"
                      value={formatCurrency(currentSales)}
                      icon={DollarSign}
                      trend={previousMetric ? calculateTrend(Number(latestMetric?.sales), Number(previousMetric?.sales)) : undefined}
                    />
                    <StatsCard
                      title="YTD Earnings"
                      value={formatCurrency(earningsYtd)}
                      icon={Wallet}
                    />
                    <StatsCard
                      title="Points"
                      value={Number(latestMetric?.points || 0).toLocaleString()}
                      icon={Star}
                      trend={previousMetric ? calculateTrend(Number(latestMetric?.points), Number(previousMetric?.points)) : undefined}
                    />
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
                    <StatsCard
                      title="Avg Job Size"
                      value={formatCurrency(averageJobSize)}
                      icon={Calculator}
                      valueClassName={getAvgJobSizeColor(averageJobSize)}
                    />
                    <StatsCard
                      title="Lead to Close %"
                      value={`${leadToCloseRate.toFixed(1)}%`}
                      icon={Percent}
                      valueClassName={getLeadToCloseColor(leadToCloseRate)}
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
                  section="weeklyUpdates"
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
                section="fiscalProgress"
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
                  section="goalProgress"
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

          {/* Time View Toggle + Performance Charts */}
          <Collapsible open={openSections.performanceChart} onOpenChange={() => toggleSection('performanceChart')}>
            <Card>
              <SectionHeader
                title="Sales Performance"
                icon={TrendingUp}
                isOpen={openSections.performanceChart}
                section="performanceChart"
              />
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={timeView === 'weekly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeView('weekly')}
                    >
                      Weekly
                    </Button>
                    <Button
                      variant={timeView === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeView('monthly')}
                    >
                      Monthly
                    </Button>
                  </div>

                  {/* Weekly Bar Chart */}
                  {timeView === 'weekly' && chartData.length > 0 && (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [formatCurrency(value), 'Sales']}
                          />
                          <Bar
                            dataKey="sales"
                            fill="hsl(var(--accent))"
                            radius={[4, 4, 0, 0]}
                            name="Sales"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Monthly Line Chart with Goal Pace */}
                  {timeView === 'monthly' && chartData.length > 0 && (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="cumulative"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--accent))' }}
                            name="Cumulative Sales"
                          />
                          <Line
                            type="monotone"
                            dataKey="goalPace"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Goal Pace"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Original Performance Trend */}
                  {metrics.length > 1 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium mb-4">Performance Trend Over Time</h4>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metrics.map((m) => ({
                            date: new Date(m.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            sales: Number(m.sales),
                            points: Number(m.points),
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="sales"
                              stroke="hsl(var(--accent))"
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--accent))' }}
                              name="Sales ($)"
                            />
                            <Line
                              type="monotone"
                              dataKey="points"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))' }}
                              name="Points"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 52-Week Fiscal Year Bar Chart - AT THE BOTTOM */}
          {yearlyGoal > 0 && (
            <Collapsible open={openSections.weeklyChart} onOpenChange={() => toggleSection('weeklyChart')}>
              <Card>
                <SectionHeader
                  title="52-Week Progress (Fiscal Year Dec 15 - Dec 15)"
                  icon={TrendingUp}
                  isOpen={openSections.weeklyChart}
                  section="weeklyChart"
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
