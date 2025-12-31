import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DollarSign, Star, Briefcase, Target, Loader2, Wallet, Calendar } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';

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

type TimeView = 'weekly' | 'monthly';

export default function MyStats() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeView, setTimeView] = useState<TimeView>('weekly');

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

  // Prepare monthly chart data (last 6 months)
  const getMonthlyData = () => {
    const months: { [key: string]: { sales: number; cumulativeSales: number } } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[monthDate.getMonth()];
      months[monthKey] = { sales: 0, cumulativeSales: 0 };
    }

    // Populate with data
    metrics.forEach((m) => {
      const metricDate = new Date(m.metric_date);
      const monthKey = monthNames[metricDate.getMonth()];
      if (months[monthKey] !== undefined) {
        months[monthKey].sales += Number(m.sales) || 0;
      }
    });

    // Calculate cumulative
    let cumulative = 0;
    const monthlyGoalPace = yearlyGoal / 12;
    let goalCumulative = 0;
    
    return Object.entries(months).map(([month, data]) => {
      cumulative += data.sales;
      goalCumulative += monthlyGoalPace;
      return {
        period: month,
        sales: data.sales,
        cumulative,
        goalPace: goalCumulative,
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

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
