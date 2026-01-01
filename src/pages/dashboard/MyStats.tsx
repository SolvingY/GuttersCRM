import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActiveContestWidget } from '@/components/dashboard/ActiveContestWidget';
import { DollarSign, Star, Briefcase, Target, Loader2, Wallet, Calendar, Calculator, Percent, Users, TrendingUp } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  const [allWeeklyMetrics, setAllWeeklyMetrics] = useState<WeeklyMetric[]>([]); // For 52-week chart
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState<TimeView>('weekly');

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

      // Fetch all weekly metrics (up to 52 weeks for 52-week chart)
      const fiftyTwoWeeksAgo = format(subWeeks(new Date(), 52), 'yyyy-MM-dd');
      const { data: allWeeklyData, error: allWeeklyError } = await supabase
        .from('weekly_user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('week_start', fiftyTwoWeeksAgo)
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
    
    // Initialize last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekKey = `Week ${8 - i}`;
      weeks[weekKey] = { sales: 0, points: 0 };
    }

    // Populate with data
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
    // Fiscal year month order: Dec (start) → Nov (end)
    const fiscalMonthOrder = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    
    // Initialize all 12 fiscal months with zero sales
    const fiscalMonths: { [key: string]: number } = {};
    fiscalMonthOrder.forEach(month => {
      fiscalMonths[month] = 0;
    });

    // Calculate fiscal year boundaries (Dec 15, 2025 - Dec 15, 2026)
    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const fiscalEnd = FISCAL_YEAR.CURRENT_YEAR_END;

    // Aggregate from weekly_user_metrics instead of user_metrics
    allWeeklyMetrics.forEach((w) => {
      const weekStartDate = new Date(w.week_start);
      
      // Only include weeks within the fiscal year
      if (weekStartDate >= fiscalStart && weekStartDate <= fiscalEnd) {
        const monthIndex = weekStartDate.getMonth();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[monthIndex];
        
        if (fiscalMonths[monthName] !== undefined) {
          fiscalMonths[monthName] += Number(w.sales) || 0;
        }
      }
    });

    // Build chart data with cumulative sales and goal pace
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

  // Prepare 52-week progression data
  const get52WeekData = () => {
    let cumulative = 0;
    const weeklyGoalPace = yearlyGoal / 52;
    
    return allWeeklyMetrics.map((w, index) => {
      cumulative += Number(w.sales) || 0;
      return {
        week: `W${index + 1}`,
        weekLabel: format(new Date(w.week_start), 'MMM d'),
        cumulativeSales: cumulative,
        goalPace: weeklyGoalPace * (index + 1),
      };
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
          <ActiveContestWidget />

          {/* Stats Cards */}
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

          {/* Weekly Updates Section */}
          {weeklyMetrics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Recent Weekly Updates
                </CardTitle>
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
          )}

          {/* Fiscal Year Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-accent" />
                Fiscal Year Progress
              </CardTitle>
            </CardHeader>
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
          </Card>

          {/* Goal Progress Card */}
          {yearlyGoal > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
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
            </Card>
          )}

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

          {/* 52-Week Progression Chart */}
          {allWeeklyMetrics.length > 0 && yearlyGoal > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  52-Week Progress Towards Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={get52WeekData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="week" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        interval="preserveStartEnd"
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
                          name === 'cumulativeSales' ? 'Actual Sales' : 'Goal Pace'
                        ]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `Week of ${payload[0].payload.weekLabel}`;
                          }
                          return label;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cumulativeSales"
                        stroke="hsl(var(--accent))"
                        strokeWidth={3}
                        dot={false}
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
        </>
      )}
    </div>
  );
}
