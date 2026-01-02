import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActiveContestWidget } from '@/components/dashboard/ActiveContestWidget';
import { DollarSign, Star, Briefcase, Target, Loader2, Wallet, Calendar, Calculator, Percent, Users, TrendingUp, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

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

type TimeView = 'weekly' | 'monthly';

export default function MyStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState<TimeView>('weekly');
  
  // Collapsible states
  const [contestsOpen, setContestsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [fiscalOpen, setFiscalOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchMetrics = async () => {
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

  const yearlyGoal = Number(latestMetric?.yearly_goal) || 0;
  const currentSales = Number(latestMetric?.sales) || 0;
  const earningsYtd = Number(latestMetric?.earnings_ytd) || 0;
  const goalPercentage = yearlyGoal > 0 ? (currentSales / yearlyGoal) * 100 : 0;
  const amountRemaining = Math.max(0, yearlyGoal - currentSales);

  const closedDeals = Number(latestMetric?.closed_deals) || 0;
  const leads = Number(latestMetric?.leads) || 0;
  const selfGeneratedDeals = Number(latestMetric?.self_generated_deals) || 0;
  const averageJobSize = closedDeals > 0 ? currentSales / closedDeals : 0;
  const leadToCloseRate = leads > 0 ? (closedDeals / leads) * 100 : 0;

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

  const fiscalYearProgress = getFiscalYearProgress();
  const daysRemaining = getDaysRemainingInFiscalYear();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  const get52WeekData = () => {
    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; sales: number; goalPace: number; cumulativeGoal: number }[] = [];
    
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

  const getGoalColor = () => {
    if (goalPercentage >= 75) return 'text-green-600';
    if (goalPercentage >= 50) return 'text-yellow-600';
    if (goalPercentage >= 25) return 'text-orange-600';
    return 'text-red-600';
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
        <Icon className="h-5 w-5 text-accent" />
        <span className="text-lg font-semibold">{title}</span>
      </div>
      {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading text-foreground">
          My Stats <span className="text-red-500 text-lg ml-2">The 6 Figure System</span>
        </h2>
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
              <ActiveContestWidget />
            </CollapsibleContent>
          </Collapsible>

          {/* 2. Key Metrics - 4 rows, 2 columns */}
          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="py-4">
                  <CollapsibleHeader isOpen={metricsOpen} title="Key Metrics" icon={Star} />
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1: Total Sales | Avg Job Size */}
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
                
                {/* Row 2: Points | YTD Earnings (Green) */}
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
                  valueClassName="text-green-500"
                />
                
                {/* Row 3: Closed Deals | Leads */}
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
                
                {/* Row 4: Lead to Close % | Self Generated */}
                <StatsCard
                  title="Lead to Close %"
                  value={`${leadToCloseRate.toFixed(1)}%`}
                  icon={Percent}
                  valueClassName={getLeadToCloseColor(leadToCloseRate)}
                />
                <StatsCard
                  title="Self Generated"
                  value={selfGeneratedDeals.toLocaleString()}
                  icon={UserPlus}
                />
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
                  <CardContent className="pt-4">
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
                <Card>
                  <CardContent className="pt-4">
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
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* 6. Sales Performance (Charts) */}
          <Collapsible open={performanceOpen} onOpenChange={setPerformanceOpen}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="py-4">
                  <CollapsibleHeader isOpen={performanceOpen} title="Sales Performance" icon={TrendingUp} />
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-4">
              {/* Time View Toggle */}
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Sales Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Monthly Line Chart with Goal Pace */}
              {timeView === 'monthly' && chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Sales vs Goal Pace</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Original Performance Trend */}
              {metrics.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* 7. 52-Week Progress */}
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
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => [
                              formatCurrency(value),
                              name === 'sales' ? 'Weekly Sales' : name === 'cumulativeSales' ? 'Cumulative' : 'Goal Pace'
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
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}
