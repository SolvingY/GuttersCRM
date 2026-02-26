import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActiveContestWidget } from '@/components/dashboard/ActiveContestWidget';
import { DollarSign, Star, Briefcase, Target, Loader2, Wallet, Calendar, Calculator, Percent, Users, TrendingUp, ChevronDown, ChevronRight, UserPlus, Quote, HelpCircle } from 'lucide-react';
import { StaleContractsWidget } from '@/components/dashboard/StaleContractsWidget';
import { CollectionsPipelineWidget } from '@/components/dashboard/CollectionsPipelineWidget';
import { OverdueFollowupsWidget } from '@/components/dashboard/OverdueFollowupsWidget';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FISCAL_YEAR, getFiscalYearProgress, getDaysRemainingInFiscalYear } from '@/lib/constants';
import { format, subWeeks } from 'date-fns';
import { getRandomQuote } from '@/lib/motivationalQuotes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface UserMetric {
  id: string;
  sales: number;
  approved_revenue: number;
  collections: number;
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
  approved_revenue: number;
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
  const [displayName, setDisplayName] = useState('');
  const [quote] = useState(getRandomQuote());
  
  // Collapsible states
  const [contestsOpen, setContestsOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [fiscalOpen, setFiscalOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [collectionsThisMonth, setCollectionsThisMonth] = useState(0);

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
        // Get display name from latest metric
        if (data && data.length > 0) {
          const latestWithName = data.find(m => m.display_name);
          if (latestWithName) {
            setDisplayName(latestWithName.display_name || '');
          }
        }
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

      // Fetch collections this month
      const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      // Get leads assigned to this user, then fetch their payments
      const { data: myLeads } = await supabase
        .from("quote_requests")
        .select("id")
        .eq("assigned_to", user.id);
      const myLeadIds = (myLeads || []).map(l => l.id);
      let monthTotal = 0;
      if (myLeadIds.length > 0) {
        const { data: monthlyPayments } = await supabase
          .from("lead_payments")
          .select("amount")
          .in("lead_id", myLeadIds)
          .gte("created_at", startOfMonth);
        monthTotal = (monthlyPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      }
      setCollectionsThisMonth(monthTotal);

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
  // Use approved_revenue instead of sales
  const approvedRevenue = Number(latestMetric?.approved_revenue) || 0;
  const collectionsYtd = Number(latestMetric?.collections) || 0;
  const earningsYtd = Number(latestMetric?.earnings_ytd) || 0;
  const goalPercentage = yearlyGoal > 0 ? (approvedRevenue / yearlyGoal) * 100 : 0;
  const amountRemaining = Math.max(0, yearlyGoal - approvedRevenue);

  const closedDeals = Number(latestMetric?.closed_deals) || 0;
  const leads = Number(latestMetric?.leads) || 0;
  const selfGeneratedDeals = Number(latestMetric?.self_generated_deals) || 0;
  // Calculate avg job size based on approved revenue
  const averageJobSize = closedDeals > 0 ? approvedRevenue / closedDeals : 0;
  // Lead-to-Close = Canvass Deals Closed / Canvass Leads Assigned
  const canvassLeads = Number((latestMetric as any)?.canvass_leads) || 0;
  const canvassDealsClose = Number((latestMetric as any)?.canvass_deals_closed) || 0;
  const internetLeads = Number((latestMetric as any)?.internet_leads) || 0;
  const internetLeadsClosed = Number((latestMetric as any)?.internet_leads_closed) || 0;
  const totalLeadsForLtC = canvassLeads + internetLeads;
  const totalClosedForLtC = canvassDealsClose + internetLeadsClosed;
  const leadToCloseRate = totalLeadsForLtC > 0 ? (totalClosedForLtC / totalLeadsForLtC) * 100 : 0;

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

  const get52WeekData = () => {
    const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START;
    const weeklyGoalPace = yearlyGoal / 52;
    const weeks: { week: string; weekLabel: string; approvedRevenue: number; goalPace: number; cumulativeGoal: number }[] = [];
    
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
        approvedRevenue: Number(weeklyMetric?.approved_revenue) || 0,
        goalPace: weeklyGoalPace,
        cumulativeGoal: weeklyGoalPace * (i + 1),
      });
    }
    
    let cumulative = 0;
    return weeks.map(w => {
      cumulative += w.approvedRevenue;
      return { ...w, cumulativeRevenue: cumulative };
    });
  };

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
        <h2 className="text-2xl font-heading text-foreground">
          My Stats
        </h2>
        <p className="text-muted-foreground">
          Welcome back{displayName ? `, ${displayName}` : ''}! Track your personal performance metrics
        </p>
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
          {/* Overdue Follow-ups Alert */}
          <OverdueFollowupsWidget isAdmin={false} />

          {/* Stale Contracts Alert */}
          <StaleContractsWidget isAdmin={false} />

          {/* Collections Due */}
          <CollectionsPipelineWidget isAdmin={false} />

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Row 1: Approved Revenue | Avg Job Size */}
                <StatsCard
                  title="Approved Revenue"
                  value={formatCurrency(approvedRevenue)}
                  icon={DollarSign}
                  trend={previousMetric ? calculateTrend(Number(latestMetric?.approved_revenue), Number(previousMetric?.approved_revenue)) : undefined}
                />
                <StatsCard
                  title="Avg Job Size"
                  value={formatCurrency(averageJobSize)}
                  icon={Calculator}
                  valueClassName={getAvgJobSizeColor(averageJobSize)}
                />
                
                {/* Row 2: Points | Collections YTD (Green) */}
                <StatsCard
                  title="Points"
                  value={Number(latestMetric?.points || 0).toLocaleString()}
                  icon={Star}
                  trend={previousMetric ? calculateTrend(Number(latestMetric?.points), Number(previousMetric?.points)) : undefined}
                />
                <StatsCard
                  title="Collections YTD"
                  value={formatCurrency(collectionsYtd)}
                  icon={Wallet}
                  valueClassName="text-green-500"
                />
                
                {/* Row 3: YTD Earnings | Self Generated */}
                <StatsCard
                  title="YTD Earnings"
                  value={formatCurrency(earningsYtd)}
                  icon={DollarSign}
                  valueClassName="text-accent"
                />
                <StatsCard
                  title="Self Generated"
                  value={selfGeneratedDeals.toLocaleString()}
                  icon={UserPlus}
                />
                
                {/* Row 4: Closed Deals | Leads */}
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
                
                {/* Collections This Month */}
                <StatsCard
                  title="Collections This Month"
                  value={formatCurrency(collectionsThisMonth)}
                  icon={Wallet}
                  valueClassName="text-green-500"
                />
                {/* Row 5: Lead to Close % with Tooltip */}
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted">
                        <Percent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">Lead to Close %</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Lead-to-Close = (Canvass Closed + Internet Closed) / (Canvass Leads + Internet Leads)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <span className={cn("text-xl font-bold", getLeadToCloseColor(leadToCloseRate))}>
                      {leadToCloseRate.toFixed(1)}%
                    </span>
                  </div>
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
                            <p className="text-lg font-bold text-foreground">{formatCurrency(Number(week.approved_revenue) || Number(week.sales))}</p>
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
                          <p className="text-sm text-muted-foreground">Approved Revenue</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrency(approvedRevenue)}</p>
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
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => [
                              formatCurrency(value),
                              name === 'approvedRevenue' ? 'Weekly Revenue' : name === 'cumulativeRevenue' ? 'Cumulative' : 'Goal Pace'
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
                            dataKey="approvedRevenue"
                            fill="hsl(var(--accent))"
                            name="Weekly Revenue"
                            radius={[2, 2, 0, 0]}
                          />
                          <Line
                            type="monotone"
                            dataKey="cumulativeRevenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            name="Cumulative Revenue"
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
