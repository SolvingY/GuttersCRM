import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, Target, DollarSign, Users, TrendingUp, Percent, Calculator, Wallet, Download, Globe, Pencil } from 'lucide-react';
import { exportToExcel, exportToPDF, SalesRepData, CanvasserData, CompanySummary, MonthlyProgress } from '@/lib/reportGenerator';
import { ReportDateRangeModal } from '@/components/dashboard/ReportDateRangeModal';
import { format, addMonths, startOfMonth, subMonths } from 'date-fns';
import { AdSpendDialog } from '@/components/admin/AdSpendDialog';

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
  totalCanvasserLeadsSet: number;
  salesRepsCount: number;
  canvassersCount: number;
  totalSalesLeads: number;
  totalSalesClosedDeals: number;
  totalCanvasserIncome: number;
  totalSelfGenDeals: number;
  totalInternetClosed: number;
  totalCanvassDeals: number;
}

export default function CompanyGoals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<CompanyGoal | null>(null);
  const [progress, setProgress] = useState<CompanyProgress>({
    totalSales: 0,
    totalCollections: 0,
    totalLeadsClosed: 0,
    totalCanvasserLeadsSet: 0,
    salesRepsCount: 0,
    canvassersCount: 0,
    totalSalesLeads: 0,
    totalSalesClosedDeals: 0,
    totalCanvasserIncome: 0,
    totalSelfGenDeals: 0,
    totalInternetClosed: 0,
    totalCanvassDeals: 0,
  });

  // Form state
  const [salesGoal, setSalesGoal] = useState('');
  const [leadsGoal, setLeadsGoal] = useState('');
  const [internetContractsGoal, setInternetContractsGoal] = useState('');
  const [totalContractsGoal, setTotalContractsGoal] = useState('');
  const [description, setDescription] = useState('');
  const [targetLeadToCloseRatio, setTargetLeadToCloseRatio] = useState('');
  const [targetCostPerLead, setTargetCostPerLead] = useState('');
  const [targetAdSpendBudget, setTargetAdSpendBudget] = useState('');
  const [adSpendDialogOpen, setAdSpendDialogOpen] = useState(false);
  const [adSpendEditMonth, setAdSpendEditMonth] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [salesReps, setSalesReps] = useState<SalesRepData[]>([]);
  const [canvassers, setCanvassers] = useState<CanvasserData[]>([]);

  const fiscalStart = new Date(2025, 11, 15);
  const fiscalEnd = new Date(2026, 11, 15);
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  // YTD Ad Spend query - fetch all months for the current calendar year
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-01`;

  const { data: adSpendYTD = [] } = useQuery({
    queryKey: ['ad-spend-ytd', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_spend_tracking')
        .select('*')
        .gte('month', yearStart)
        .lte('month', yearEnd)
        .order('month', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Build monthly breakdown for Jan through current month
  const currentMonthIndex = new Date().getMonth(); // 0-based
  const monthlyBreakdown = Array.from({ length: currentMonthIndex + 1 }, (_, i) => {
    const monthDate = new Date(currentYear, i, 1);
    const monthKey = format(monthDate, 'yyyy-MM-dd');
    const entry = adSpendYTD.find(e => e.month === monthKey);
    return {
      month: monthKey,
      label: format(monthDate, 'MMMM yyyy'),
      shortLabel: format(monthDate, 'MMM'),
      amount: Number(entry?.ad_spend) || 0,
    };
  });

  const ytdTotal = monthlyBreakdown.reduce((sum, m) => sum + m.amount, 0);

  // Internet metrics queries
  const { data: internetLeadCount } = useQuery({
    queryKey: ['internet-leads-month'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('lead_type', 'internet')
        .not('assigned_to', 'is', null)
        .gte('assigned_at', monthStart + 'T00:00:00');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: internetContractsWon } = useQuery({
    queryKey: ['internet-contracts-won-month'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('lead_type', 'internet')
        .eq('status', 'won')
        .gte('won_at', monthStart + 'T00:00:00');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: internetClosedFromMetrics } = useQuery({
    queryKey: ['internet-ltc-totals'],
    queryFn: async () => {
      const { data: metrics, error } = await supabase
        .from('user_metrics')
        .select('user_id, internet_leads, internet_leads_closed')
        .order('metric_date', { ascending: false });
      if (error) throw error;
      const seen = new Set<string>();
      let totalLeads = 0;
      let totalClosed = 0;
      for (const m of metrics || []) {
        if (seen.has(m.user_id)) continue;
        seen.add(m.user_id);
        totalLeads += Number(m.internet_leads) || 0;
        totalClosed += Number(m.internet_leads_closed) || 0;
      }
      return { totalLeads, totalClosed };
    },
  });

  const internetData = {
    adSpend: ytdTotal,
    currentMonthAdSpend: monthlyBreakdown[currentMonthIndex]?.amount || 0,
    internetLeadCount: internetLeadCount || 0,
    internetContractsWon: internetContractsWon || 0,
    internetClosedCount: internetClosedFromMetrics?.totalClosed || 0,
    internetTotalLeads: internetClosedFromMetrics?.totalLeads || 0,
  };

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
        setTargetAdSpendBudget(String((goalData as any).target_ad_spend_budget || ''));
        setInternetContractsGoal(String((goalData as any).internet_contracts_goal || ''));
        setTotalContractsGoal(String((goalData as any).total_contracts_goal || ''));
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
            .select('user_id, approved_revenue, collections, leads, closed_deals, display_name, sales_rank, earnings_ytd, points, yearly_goal, self_generated_leads, canvass_leads, self_generated_deals, canvass_deals_closed, internet_leads_closed')
            .in('user_id', salesRepIds)
            .order('metric_date', { ascending: false })
        : { data: [] };

      // Get latest metrics per user
      const salesByUser = new Map<string, { 
        approvedRevenue: number; 
        collections: number; 
        name: string; 
        salesRank: string; 
        earningsYtd: number; 
        points: number; 
        yearlyGoal: number;
        selfGeneratedLeads: number;
        canvassLeads: number;
        selfGeneratedDeals: number;
        canvassDealsClose: number;
        internetLeadsClosed: number;
      }>();
      salesData?.forEach(s => {
        if (!salesByUser.has(s.user_id)) {
          salesByUser.set(s.user_id, {
            approvedRevenue: Number(s.approved_revenue) || 0,
            collections: Number(s.collections) || 0,
            name: s.display_name || 'Unknown',
            salesRank: s.sales_rank || 'SR1',
            earningsYtd: Number(s.earnings_ytd) || 0,
            points: Number(s.points) || 0,
            yearlyGoal: Number(s.yearly_goal) || 0,
            selfGeneratedLeads: Number(s.self_generated_leads) || 0,
            canvassLeads: Number(s.canvass_leads) || 0,
            selfGeneratedDeals: Number(s.self_generated_deals) || 0,
            canvassDealsClose: Number(s.canvass_deals_closed) || 0,
            internetLeadsClosed: Number(s.internet_leads_closed) || 0,
          });
        }
      });
      const totalSales = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.approvedRevenue, 0);
      const totalCollections = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.collections, 0);
      const totalSalesLeads = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.selfGeneratedLeads + s.canvassLeads, 0);
      const totalSalesClosedDeals = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.selfGeneratedDeals + s.canvassDealsClose, 0);
      const totalSelfGenDeals = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.selfGeneratedDeals, 0);
      const totalCanvassDeals = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.canvassDealsClose, 0);
      const totalInternetClosed = Array.from(salesByUser.values()).reduce((sum, s) => sum + s.internetLeadsClosed, 0);

      // Fetch total leads and income from canvassers
      const { data: canvasserData } = canvasserIds.length > 0
        ? await supabase
            .from('canvasser_metrics')
            .select('user_id, leads_closed, income, leads_set')
            .in('user_id', canvasserIds)
            .order('metric_date', { ascending: false })
        : { data: [] };

      // Get latest leads and income per user
      const leadsByUser = new Map<string, { leadsClosed: number; income: number; leadsSet: number; leadsWithDamage: number; hoursWorked: number; points: number; name: string; yearlyGoal: number }>();
      canvasserData?.forEach(c => {
        if (!leadsByUser.has(c.user_id)) {
          leadsByUser.set(c.user_id, {
            leadsClosed: Number(c.leads_closed) || 0,
            income: Number(c.income) || 0,
            leadsSet: Number((c as any).leads_set) || 0,
            leadsWithDamage: Number((c as any).leads_with_damage) || 0,
            hoursWorked: Number((c as any).hours_worked) || 0,
            points: Number((c as any).points) || 0,
            name: (c as any).display_name || 'Unknown',
            yearlyGoal: Number((c as any).yearly_goal) || 0,
          });
        }
      });
      const totalLeadsClosed = Array.from(leadsByUser.values()).reduce((sum, l) => sum + l.leadsClosed, 0);
      const totalCanvasserLeadsSet = Array.from(leadsByUser.values()).reduce((sum, l) => sum + l.leadsSet, 0);
      const totalCanvasserIncome = Array.from(leadsByUser.values()).reduce((sum, l) => sum + l.income, 0);

      // Build salesReps array for exports
      const salesRepsData: SalesRepData[] = Array.from(salesByUser.entries()).map(([_, s]) => {
        const calculatedLeads = s.selfGeneratedLeads + s.canvassLeads;
        const calculatedClosedDeals = s.selfGeneratedDeals + s.canvassDealsClose;
        
        return {
          name: s.name,
          salesRank: s.salesRank,
          approvedRevenue: s.approvedRevenue,
          collections: s.collections,
          earningsYtd: s.earningsYtd,
          points: s.points,
          leads: calculatedLeads,
          closedDeals: calculatedClosedDeals,
          yearlyGoal: s.yearlyGoal,
          avgJobSize: calculatedClosedDeals > 0 ? s.approvedRevenue / calculatedClosedDeals : 0,
          leadToClosePercent: calculatedLeads > 0 ? (calculatedClosedDeals / calculatedLeads) * 100 : 0,
        };
      });
      setSalesReps(salesRepsData);

      // Build canvassers array for exports
      const canvassersData: CanvasserData[] = Array.from(leadsByUser.entries()).map(([_, c]) => ({
        name: c.name,
        leadsSet: c.leadsSet,
        leadsClosed: c.leadsClosed,
        leadsWithDamage: c.leadsWithDamage,
        hoursWorked: c.hoursWorked || 0,
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
        totalCanvasserLeadsSet,
        salesRepsCount: salesByUser.size,
        canvassersCount: leadsByUser.size,
        totalSalesLeads,
        totalSalesClosedDeals,
        totalCanvasserIncome,
        totalSelfGenDeals,
        totalInternetClosed,
        totalCanvassDeals,
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
        target_ad_spend_budget: parseFloat(targetAdSpendBudget) || 0,
        internet_contracts_goal: parseInt(internetContractsGoal) || 0,
        total_contracts_goal: parseInt(totalContractsGoal) || 0,
      } as any;

      if (goal?.id) {
        const { error } = await supabase
          .from('company_goals')
          .update(goalData)
          .eq('id', goal.id);

        if (error) throw error;
      } else {
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
  const internetContractsGoalNum = parseInt(internetContractsGoal) || 0;
  const totalContractsGoalNum = parseInt(totalContractsGoal) || 0;
  const salesProgress = salesGoalNum > 0 ? (progress.totalSales / salesGoalNum) * 100 : 0;
  const leadsProgress = leadsGoalNum > 0 ? (progress.totalLeadsClosed / leadsGoalNum) * 100 : 0;
  const internetContractsProgress = internetContractsGoalNum > 0 ? (progress.totalInternetClosed / internetContractsGoalNum) * 100 : 0;
  const totalAllContracts = progress.totalSelfGenDeals + progress.totalCanvassDeals + progress.totalInternetClosed;
  const totalContractsProgress = totalContractsGoalNum > 0 ? (totalAllContracts / totalContractsGoalNum) * 100 : 0;

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
            totalHoursWorked: canvassers.reduce((sum, c) => sum + c.hoursWorked, 0),
            totalCanvasserIncome: progress.totalCanvasserIncome,
            salesRevenueGoal: parseFloat(salesGoal) || 0,
            canvasserLeadsGoal: parseInt(leadsGoal) || 0,
            targetLeadToCloseRatio: parseFloat(targetLeadToCloseRatio) || 0,
            targetCostPerLead: parseFloat(targetCostPerLead) || 0,
            fiscalYearStart: format(fiscalStart, 'yyyy-MM-dd'),
            fiscalYearEnd: format(fiscalEnd, 'yyyy-MM-dd'),
            salesProgressPercent: salesGoalNum > 0 ? (progress.totalSales / salesGoalNum) * 100 : 0,
            leadsProgressPercent: leadsGoalNum > 0 ? (progress.totalLeadsClosed / leadsGoalNum) * 100 : 0,
            actualCostPerLead: actualCostPerLead,
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
              <Label htmlFor="leadsGoal">Canvasser Contracts Goal</Label>
              <Input
                id="leadsGoal"
                type="number"
                min="0"
                placeholder="e.g., 1000"
                value={leadsGoal}
                onChange={(e) => setLeadsGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Target canvasser contracts closed for the year
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="internetContractsGoal">Internet Contracts Goal</Label>
              <Input
                id="internetContractsGoal"
                type="number"
                min="0"
                placeholder="e.g., 100"
                value={internetContractsGoal}
                onChange={(e) => setInternetContractsGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Target internet contracts closed for the year
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalContractsGoal">Total Contracts Goal (All Sources)</Label>
              <Input
                id="totalContractsGoal"
                type="number"
                min="0"
                placeholder="e.g., 1200"
                value={totalContractsGoal}
                onChange={(e) => setTotalContractsGoal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Combined target: Self-Gen + Canvass + Internet
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
              <Label htmlFor="targetCostPerLead">Target Cost per Contract ($)</Label>
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
                Target cost to acquire a closed contract (applies to both Canvass &amp; Internet)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAdSpendBudget">Monthly Ad Spend Budget ($)</Label>
              <Input
                id="targetAdSpendBudget"
                type="number"
                min="0"
                step="100"
                placeholder="e.g., 5000"
                value={targetAdSpendBudget}
                onChange={(e) => setTargetAdSpendBudget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Target monthly advertising budget for internet leads
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

      {/* Progress Cards - Row 1: Revenue + Collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Progress Cards - Row 2: Contract Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canvasser Contracts Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Canvasser Contracts
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
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.max(0, leadsGoalNum - progress.totalLeadsClosed).toLocaleString()} contracts
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Internet Contracts Progress */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-blue-500" />
              Internet Contracts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground break-words">{progress.totalInternetClosed.toLocaleString()}</p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-lg lg:text-xl font-semibold text-foreground break-words">{internetContractsGoalNum.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={Math.min(internetContractsProgress, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From user metrics</span>
                <span className={internetContractsProgress >= 100 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                  {internetContractsProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            {internetContractsGoalNum > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold text-foreground">
                  {Math.max(0, internetContractsGoalNum - progress.totalInternetClosed).toLocaleString()} contracts
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Contracts Progress */}
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-accent" />
              Total Contracts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground break-words">{totalAllContracts.toLocaleString()}</p>
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-lg lg:text-xl font-semibold text-foreground break-words">{totalContractsGoalNum.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={Math.min(totalContractsProgress, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Self-Gen + Canvass + Internet</span>
                <span className={totalContractsProgress >= 100 ? 'text-green-500 font-semibold' : 'text-foreground font-semibold'}>
                  {totalContractsProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Self-Gen</span>
                <span className="font-medium text-foreground">{progress.totalSelfGenDeals}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Canvass</span>
                <span className="font-medium text-foreground">{progress.totalCanvassDeals}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Internet</span>
                <span className="font-medium text-foreground">{progress.totalInternetClosed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Cards with Goal Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lead-to-Close Rate (Canvasser) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-primary" />
              Lead-to-Close Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const currentRate = progress.totalCanvasserLeadsSet > 0 
                ? (progress.totalLeadsClosed / progress.totalCanvasserLeadsSet) * 100 
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
                        {progress.totalLeadsClosed} closed / {progress.totalCanvasserLeadsSet} leads set
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

        {/* Cost Per Contract (Canvass) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Canvass Cost Per Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const currentCost = progress.totalLeadsClosed > 0 
                ? progress.totalCanvasserIncome / progress.totalLeadsClosed 
                : 0;
              const targetCost = parseFloat(targetCostPerLead) || 0;
              const variance = targetCost - currentCost;
              const isOnTarget = targetCost === 0 || currentCost <= targetCost;
              
              return (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {progress.totalLeadsClosed > 0 ? formatCurrency(currentCost) : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(progress.totalCanvasserIncome)} paid / {progress.totalLeadsClosed} contracts
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

        {/* Cost Per Lead (based on leads set) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-blue-500" />
              Cost Per Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const costPerLead = progress.totalCanvasserLeadsSet > 0 
                ? progress.totalCanvasserIncome / progress.totalCanvasserLeadsSet 
                : 0;
              const costPerContract = progress.totalLeadsClosed > 0 
                ? progress.totalCanvasserIncome / progress.totalLeadsClosed 
                : 0;
              
              return (
                <>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {progress.totalCanvasserLeadsSet > 0 ? formatCurrency(costPerLead) : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(progress.totalCanvasserIncome)} paid / {progress.totalCanvasserLeadsSet} leads set
                    </p>
                  </div>
                  {progress.totalLeadsClosed > 0 && progress.totalCanvasserLeadsSet > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">vs Cost Per Contract</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatCurrency(costPerContract)}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Internet / Call-In Lead Metrics */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Internet / Call-In Lead Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Track performance and ROI for internet-sourced leads (website, phone calls, referrals)
          </p>
        </div>

        {/* Ad Spend YTD Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-accent" />
              Ad Spend (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {ytdTotal > 0 ? formatCurrency(ytdTotal) : '$0'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cumulative spend Jan–{format(new Date(), 'MMM yyyy')}
                </p>
              </div>
              {(() => {
                const budget = parseFloat(targetAdSpendBudget) || 0;
                const monthsElapsed = currentMonthIndex + 1;
                const expectedBudget = budget * monthsElapsed;
                if (budget > 0 && ytdTotal > 0) {
                  const variance = expectedBudget - ytdTotal;
                  const isUnder = variance >= 0;
                  return (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Budget (YTD)</p>
                      <p className="text-xl font-semibold text-foreground">{formatCurrency(expectedBudget)}</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {(() => {
              const budget = parseFloat(targetAdSpendBudget) || 0;
              const monthsElapsed = currentMonthIndex + 1;
              const expectedBudget = budget * monthsElapsed;
              if (budget > 0 && ytdTotal > 0) {
                const variance = expectedBudget - ytdTotal;
                const isUnder = variance >= 0;
                return (
                  <div className={`rounded-lg p-3 ${isUnder ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isUnder ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isUnder ? '✓ Under budget' : '⚠ Over budget'}
                      </span>
                      <span className={`text-sm font-semibold ${isUnder ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isUnder ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Monthly breakdown */}
            <div className="border-t border-border pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2">Monthly Breakdown</p>
              <div className="space-y-1.5">
                {monthlyBreakdown.map((m) => (
                  <div key={m.month} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{formatCurrency(m.amount)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setAdSpendEditMonth(m.month);
                          setAdSpendDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3 Internet Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Internet Lead-to-Close Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="h-5 w-5 text-primary" />
                Internet Lead-to-Close Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const currentRate = internetData.internetLeadCount > 0
                  ? (internetData.internetClosedCount / internetData.internetLeadCount) * 100
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
                          {internetData.internetClosedCount} closed / {internetData.internetLeadCount} leads
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

          {/* Internet Cost Per Contract - now compares against target_cost_per_lead */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Internet Cost Per Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const currentCost = internetData.internetContractsWon > 0
                  ? internetData.currentMonthAdSpend / internetData.internetContractsWon
                  : 0;
                const targetCost = parseFloat(targetCostPerLead) || 0;
                const variance = targetCost - currentCost;
                const isOnTarget = targetCost === 0 || currentCost <= targetCost;

                return (
                  <>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-foreground">
                          {internetData.internetContractsWon > 0 ? formatCurrency(currentCost) : 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(internetData.currentMonthAdSpend)} spent / {internetData.internetContractsWon} contracts
                        </p>
                      </div>
                      {targetCost > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Goal</p>
                          <p className="text-xl font-semibold text-foreground">{formatCurrency(targetCost)}</p>
                        </div>
                      )}
                    </div>
                    {targetCost > 0 && internetData.internetContractsWon > 0 && (
                      <div className={`rounded-lg p-3 ${isOnTarget ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isOnTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isOnTarget ? '✓ Under target' : '⚠ Over target'}
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

          {/* Internet Cost Per Lead */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-accent" />
                Internet Cost Per Lead
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const costPerLead = internetData.internetLeadCount > 0
                  ? internetData.currentMonthAdSpend / internetData.internetLeadCount
                  : 0;
                const costPerContract = internetData.internetContractsWon > 0
                  ? internetData.currentMonthAdSpend / internetData.internetContractsWon
                  : 0;

                return (
                  <>
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {internetData.internetLeadCount > 0 ? formatCurrency(costPerLead) : 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(internetData.currentMonthAdSpend)} spent / {internetData.internetLeadCount} leads
                      </p>
                    </div>
                    {internetData.internetContractsWon > 0 && internetData.internetLeadCount > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">vs Cost Per Contract</p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency(costPerContract)}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      <AdSpendDialog
        open={adSpendDialogOpen}
        onOpenChange={(open) => {
          setAdSpendDialogOpen(open);
          if (!open) setAdSpendEditMonth(null);
        }}
        initialMonth={adSpendEditMonth || undefined}
      />

      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How Company Goals Work</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Set annual targets for combined sales revenue and canvasser contracts closed</li>
                <li>Progress is automatically calculated from all team members' metrics</li>
                <li>Sales reps contribute to the revenue goal, canvassers contribute to the contracts goal</li>
                <li>Track company-wide performance against targets in real-time</li>
                <li>Cost Per Contract goal applies to both Canvass and Internet contracts</li>
                <li>Ad Spend tracks cumulative YTD spending with monthly breakdowns</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
