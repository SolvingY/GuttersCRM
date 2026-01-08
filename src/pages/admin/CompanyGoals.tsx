import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, Target, DollarSign, Users, TrendingUp, Percent, Calculator, Wallet, Download } from 'lucide-react';
import { exportToExcel, exportToPDF, SalesRepData, CanvasserData, CompanySummary, MonthlyProgress } from '@/lib/reportGenerator';
import { ReportDateRangeModal } from '@/components/dashboard/ReportDateRangeModal';
import { format, addMonths } from 'date-fns';

interface CompanyGoal {
  id: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  sales_revenue_goal: number;
  canvasser_leads_goal: number;
  description: string | null;
  target_lead_to_close_ratio: number;
  target_cost_per_lead: number;
}

interface CompanyProgress {
  totalSales: number;
  totalCollections: number;
  totalLeadsClosed: number;
  salesRepsCount: number;
  canvassersCount: number;
  totalSalesLeads: number;
  totalSalesClosedDeals: number;
  totalCanvasserIncome: number;
}

export default function CompanyGoals() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<CompanyGoal | null>(null);
  const [progress, setProgress] = useState<CompanyProgress>({
    totalSales: 0,
    totalCollections: 0,
    totalLeadsClosed: 0,
    salesRepsCount: 0,
    canvassersCount: 0,
    totalSalesLeads: 0,
    totalSalesClosedDeals: 0,
    totalCanvasserIncome: 0,
  });

  // Form state
  const [salesGoal, setSalesGoal] = useState('');
  const [leadsGoal, setLeadsGoal] = useState('');
  const [description, setDescription] = useState('');
  const [targetLeadToCloseRatio, setTargetLeadToCloseRatio] = useState('');
  const [targetCostPerLead, setTargetCostPerLead] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRepData[]>([]);
  const [canvassers, setCanvassers] = useState<CanvasserData[]>([]);

  const fiscalStart = new Date(2025, 11, 15); // Dec 15, 2025
  const fiscalEnd = new Date(2026, 11, 15); // Dec 15, 2026

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing company goal
      const { data: goalData } = await supabase
        .from('company_goals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalData) {
        setGoal(goalData);
        setSalesGoal(String(goalData.sales_revenue_goal || ''));
        setLeadsGoal(String(goalData.canvasser_leads_goal || ''));
        setDescription(goalData.description || '');
        setTargetLeadToCloseRatio(String(goalData.target_lead_to_close_ratio || ''));
        setTargetCostPerLead(String(goalData.target_cost_per_lead || ''));
      }

      // Fetch sales rep metrics
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const salesRepIds = rolesData?.filter(r => r.role === 'user' || r.role === 'admin').map(r => r.user_id) || [];
      const canvasserIds = rolesData?.filter(r => r.role === 'canvasser').map(r => r.user_id) || [];

      // Fetch total sales from sales reps
      const { data: salesData } = salesRepIds.length > 0
        ? await supabase
            .from('user_metrics')
            .select('user_id, sales, collections, leads, closed_deals')
            .in('user_id', salesRepIds)
            .order('metric_date', { ascending: false })
        : { data: [] };

      // Get latest metrics per user
      const salesByUser = new Map<string, { sales: number; collections: number; leads: number; closedDeals: number }>();
      salesData?.forEach(s => {
        if (!salesByUser.has(s.user_id)) {
          salesByUser.set(s.user_id, {
            sales: Number(s.sales) || 0,
            collections: Number(s.collections) || 0,
            leads: Number(s.leads) || 0,
            closedDeals: Number(s.closed_deals) || 0,
          });
        }
      });
      const totalSales = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.sales, 0);
      const totalCollections = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.collections, 0);
      const totalSalesLeads = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.leads, 0);
      const totalSalesClosedDeals = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.closedDeals, 0);

      // Fetch total leads and income from canvassers
      const { data: canvasserData } = canvasserIds.length > 0
        ? await supabase
            .from('canvasser_metrics')
            .select('user_id, leads_closed, income')
            .in('user_id', canvasserIds)
            .order('metric_date', { ascending: false })
        : { data: [] };

      // Get latest leads and income per user
      const leadsByUser = new Map<string, { leadsClosed: number; income: number; leadsSet: number; leadsWithDamage: number; shiftsWorked: number; points: number; name: string; yearlyGoal: number }>();
      canvasserData?.forEach(c => {
        if (!leadsByUser.has(c.user_id)) {
          leadsByUser.set(c.user_id, {
            leadsClosed: Number(c.leads_closed) || 0,
            income: Number(c.income) || 0,
            leadsSet: Number((c as any).leads_set) || 0,
            leadsWithDamage: Number((c as any).leads_with_damage) || 0,
            shiftsWorked: Number((c as any).shifts_worked) || 0,
            points: Number((c as any).points) || 0,
            name: (c as any).display_name || 'Unknown',
            yearlyGoal: Number((c as any).yearly_goal) || 0,
          });
        }
      });
      const totalLeadsClosed = Array.from(leadsByUser.values()).reduce((sum, l) => sum + l.leadsClosed, 0);
      const totalCanvasserIncome = Array.from(leadsByUser.values()).reduce((sum, l) => sum + l.income, 0);

      // Build salesReps array for exports
      const salesRepsData: SalesRepData[] = Array.from(salesByUser.entries()).map(([_, s]) => ({
        name: (s as any).name || 'Unknown',
        salesRank: (s as any).salesRank || 'SR1',
        approvedRevenue: s.sales,
        collections: s.collections,
        earningsYtd: (s as any).earningsYtd || 0,
        points: (s as any).points || 0,
        leads: s.leads,
        closedDeals: s.closedDeals,
        yearlyGoal: (s as any).yearlyGoal || 0,
        avgJobSize: s.closedDeals > 0 ? s.sales / s.closedDeals : 0,
        leadToClosePercent: s.leads > 0 ? (s.closedDeals / s.leads) * 100 : 0,
      }));
      setSalesReps(salesRepsData);

      // Build canvassers array for exports
      const canvassersData: CanvasserData[] = Array.from(leadsByUser.entries()).map(([_, c]) => ({
        name: c.name,
        leadsSet: c.leadsSet,
        leadsClosed: c.leadsClosed,
        leadsWithDamage: c.leadsWithDamage,
        shiftsWorked: c.shiftsWorked,
        points: c.points,
        income: c.income,
        conversionRate: c.leadsSet > 0 ? (c.leadsClosed / c.leadsSet) * 100 : 0,
        yearlyGoal: c.yearlyGoal,
      }));
      setCanvassers(canvassersData);

      setProgress({
        totalSales,
        totalCollections,
        totalLeadsClosed,
        salesRepsCount: salesByUser.size,
        canvassersCount: leadsByUser.size,
        totalSalesLeads,
        totalSalesClosedDeals,
        totalCanvasserIncome,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate monthly progress data for the graph
  const generateMonthlyProgress = (): MonthlyProgress[] => {
    const salesGoalNum = parseFloat(salesGoal) || 0;
    const leadsGoalNum = parseInt(leadsGoal) || 0;
    const monthlyGoalRevenue = salesGoalNum / 12;
    const monthlyGoalLeads = leadsGoalNum / 12;
    
    const now = new Date();
    const months: MonthlyProgress[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(fiscalStart, i);
      const monthName = format(monthDate, 'MMM yyyy');
      const isPast = monthDate <= now;
      
      const monthsElapsed = Math.max(1, Math.floor((now.getTime() - fiscalStart.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const monthlyRevenue = isPast ? progress.totalSales / Math.min(monthsElapsed, i + 1) : 0;
      const monthlyLeads = isPast ? Math.floor(progress.totalLeadsClosed / Math.min(monthsElapsed, i + 1)) : 0;
      
      months.push({
        month: monthName,
        revenue: isPast ? monthlyRevenue : 0,
        leads: isPast ? monthlyLeads : 0,
        revenueGoal: monthlyGoalRevenue * (i + 1),
        leadsGoal: Math.floor(monthlyGoalLeads * (i + 1)),
      });
    }
    return months;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const goalData = {
        fiscal_year_start: format(fiscalStart, 'yyyy-MM-dd'),
        fiscal_year_end: format(fiscalEnd, 'yyyy-MM-dd'),
        sales_revenue_goal: parseFloat(salesGoal) || 0,
        canvasser_leads_goal: parseInt(leadsGoal) || 0,
        description: description || null,
        target_lead_to_close_ratio: parseFloat(targetLeadToCloseRatio) || 0,
        target_cost_per_lead: parseFloat(targetCostPerLead) || 0,
      };

      if (goal?.id) {
        // Update existing goal
        const { error } = await supabase
          .from('company_goals')
          .update(goalData)
          .eq('id', goal.id);

        if (error) throw error;
      } else {
        // Insert new goal
        const { error } = await supabase
          .from('company_goals')
          .insert(goalData);

        if (error) throw error;
      }

      toast({
        title: 'Company Goals Saved',
        description: 'Your company-wide goals have been updated.',
      });

      fetchData();
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company goals',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const salesGoalNum = parseFloat(salesGoal) || 0;
  const leadsGoalNum = parseInt(leadsGoal) || 0;
  const salesProgress = salesGoalNum > 0 ? (progress.totalSales / salesGoalNum) * 100 : 0;
  const leadsProgress = leadsGoalNum > 0 ? (progress.totalLeadsClosed / leadsGoalNum) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Company Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set and track 12-month company-wide goals for sales and canvassing teams
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setReportModalOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <ReportDateRangeModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onExport={(startDate, endDate, exportFormat) => {
          const monthlyProgress = generateMonthlyProgress();
          const actualCostPerLead = progress.totalLeadsClosed > 0 
            ? progress.totalCanvasserIncome / progress.totalLeadsClosed 
            : 0;
          
          const summary: CompanySummary = {
            totalApprovedRevenue: progress.totalSales,
            totalCollections: progress.totalCollections,
            totalPoints: salesReps.reduce((sum, s) => sum + s.points, 0),
            totalLeads: progress.totalSalesLeads,
            totalClosedDeals: progress.totalSalesClosedDeals,
            salesRepCount: progress.salesRepsCount,
            canvasserCount: progress.canvassersCount,
            companyLeadCloseRate: progress.totalSalesLeads > 0 ? (progress.totalSalesClosedDeals / progress.totalSalesLeads) * 100 : 0,
            totalLeadsSet: canvassers.reduce((sum, c) => sum + c.leadsSet, 0),
            totalLeadsClosed: progress.totalLeadsClosed,
            totalLeadsWithDamage: canvassers.reduce((sum, c) => sum + c.leadsWithDamage, 0),
            totalShiftsWorked: canvassers.reduce((sum, c) => sum + c.shiftsWorked, 0),
            totalCanvasserIncome: progress.totalCanvasserIncome,
            // Company Goals
            salesRevenueGoal: parseFloat(salesGoal) || 0,
            canvasserLeadsGoal: parseInt(leadsGoal) || 0,
            targetLeadToCloseRatio: parseFloat(targetLeadToCloseRatio) || 0,
            targetCostPerLead: parseFloat(targetCostPerLead) || 0,
            fiscalYearStart: format(fiscalStart, 'yyyy-MM-dd'),
            fiscalYearEnd: format(fiscalEnd, 'yyyy-MM-dd'),
            // Progress calculations
            salesProgressPercent: salesGoalNum > 0 ? (progress.totalSales / salesGoalNum) * 100 : 0,
            leadsProgressPercent: leadsGoalNum > 0 ? (progress.totalLeadsClosed / leadsGoalNum) * 100 : 0,
            actualCostPerLead: actualCostPerLead,
            // Monthly Progress for Graph
            monthlyProgress: monthlyProgress,
          };
          
          if (exportFormat === 'excel') {
            exportToExcel(salesReps, canvassers, summary, { startDate, endDate });
            toast({ title: 'Excel report downloaded' });
          } else {
            exportToPDF(salesReps, canvassers, summary, { startDate, endDate, includeGraph: true });
            toast({ title: 'PDF report downloaded' });
          }
        }}
      />

      {/* Goal Setting Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Fiscal Year Goals
          </CardTitle>
          <CardDescription>
            Dec 15, 2025 - Dec 15, 2026
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesGoal">Company Sales Revenue Goal ($)</Label>
              <Input
                id="salesGoal"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g., 5000000"
                value={salesGoal}
                onChange={(e) => setSalesGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Combined target for all sales reps
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadsGoal">Company Leads Closed Goal</Label>
              <Input
                id="leadsGoal"
                type="number"
                min="0"
                placeholder="e.g., 1000"
                value={leadsGoal}
                onChange={(e) => setLeadsGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Combined target for all canvassers
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetLeadToCloseRatio">Target Lead-to-Close % Goal</Label>
              <Input
                id="targetLeadToCloseRatio"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g., 40"
                value={targetLeadToCloseRatio}
                onChange={(e) => setTargetLeadToCloseRatio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Target close rate for sales team
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCostPerLead">Target Cost per Lead ($)</Label>
              <Input
                id="targetCostPerLead"
                type="number"
                min="0"
                step="1"
                placeholder="e.g., 150"
                value={targetCostPerLead}
                onChange={(e) => setTargetCostPerLead(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Target cost to acquire a closed lead
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Q4 push for end of year targets"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Goals
          </Button>
        </CardContent>
      </Card>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Progress */}
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-accent" />
              Sales Revenue Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground break-words">{formatCurrency(progress.totalSales)}</p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-lg lg:text-xl font-semibold text-foreground break-words">{formatCurrency(salesGoalNum)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={Math.min(salesProgress, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.salesRepsCount} sales reps</span>
                <span className={salesProgress >= 100 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                  {salesProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            {salesGoalNum > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Remaining to goal</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(Math.max(0, salesGoalNum - progress.totalSales))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Canvasser Leads Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground break-words">{progress.totalLeadsClosed.toLocaleString()}</p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-lg lg:text-xl font-semibold text-foreground break-words">{leadsGoalNum.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={Math.min(leadsProgress, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progress.canvassersCount} canvassers</span>
                <span className={leadsProgress >= 100 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                  {leadsProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            {leadsGoalNum > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Remaining to goal</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.max(0, leadsGoalNum - progress.totalLeadsClosed).toLocaleString()} leads
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collections YTD */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-green-500" />
              Total Collections YTD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground break-words">{formatCurrency(progress.totalCollections)}</p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm text-muted-foreground">vs Sales</p>
                <p className="text-lg lg:text-xl font-semibold text-foreground break-words">{formatCurrency(progress.totalSales)}</p>
              </div>
            </div>
            {(() => {
              const collectionRate = progress.totalSales > 0 
                ? (progress.totalCollections / progress.totalSales) * 100 
                : 0;
              return (
                <>
                  <div className="space-y-2">
                    <Progress value={Math.min(collectionRate, 100)} className="h-3" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collection Rate</span>
                      <span className={collectionRate >= 80 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                        {collectionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(Math.max(0, progress.totalSales - progress.totalCollections))}
                    </p>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Cards with Goal Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Lead-to-Close Rate with Goal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-accent" />
              Sales Lead-to-Close Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const currentRate = progress.totalSalesLeads > 0 
                ? (progress.totalSalesClosedDeals / progress.totalSalesLeads) * 100 
                : 0;
              const targetRate = parseFloat(targetLeadToCloseRatio) || 0;
              const variance = currentRate - targetRate;
              const isOnTarget = targetRate === 0 || currentRate >= targetRate;
              
              return (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {currentRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {progress.totalSalesClosedDeals} closed / {progress.totalSalesLeads} leads
                      </p>
                    </div>
                    {targetRate > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p className="text-xl font-semibold text-foreground">{targetRate.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                  {targetRate > 0 && (
                    <div className={`rounded-lg p-3 ${isOnTarget ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isOnTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isOnTarget ? '✓ On target' : '⚠ Below target'}
                        </span>
                        <span className={`text-sm font-semibold ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Canvasser Cost per Lead with Goal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Canvasser Cost per Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const currentCost = progress.totalLeadsClosed > 0 
                ? progress.totalCanvasserIncome / progress.totalLeadsClosed 
                : 0;
              const targetCost = parseFloat(targetCostPerLead) || 0;
              const variance = targetCost - currentCost; // Positive = under budget (good)
              const isOnTarget = targetCost === 0 || currentCost <= targetCost;
              
              return (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {progress.totalLeadsClosed > 0 ? formatCurrency(currentCost) : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(progress.totalCanvasserIncome)} paid / {progress.totalLeadsClosed} leads
                      </p>
                    </div>
                    {targetCost > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p className="text-xl font-semibold text-foreground">{formatCurrency(targetCost)}</p>
                      </div>
                    )}
                  </div>
                  {targetCost > 0 && progress.totalLeadsClosed > 0 && (
                    <div className={`rounded-lg p-3 ${isOnTarget ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isOnTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isOnTarget ? '✓ Under budget' : '⚠ Over budget'}
                        </span>
                        <span className={`text-sm font-semibold ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {variance >= 0 ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How Company Goals Work</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Set annual targets for combined sales revenue and canvasser leads closed</li>
                <li>Progress is automatically calculated from all team members' metrics</li>
                <li>Sales reps contribute to the revenue goal, canvassers contribute to the leads goal</li>
                <li>Track company-wide performance against targets in real-time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
