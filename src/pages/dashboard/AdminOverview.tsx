import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { EditMetricsModal } from '@/components/dashboard/EditMetricsModal';
import { EditCanvasserMetricsModal } from '@/components/dashboard/EditCanvasserMetricsModal';
import { UserStatsModal } from '@/components/dashboard/UserStatsModal';
import { RecentPointTransactionsWidget } from '@/components/dashboard/RecentPointTransactionsWidget';
import { ReportDateRangeModal } from '@/components/dashboard/ReportDateRangeModal';
import { DollarSign, Star, Users, Briefcase, UserCheck, Loader2, Pencil, Eye, AlertTriangle, Shield, Target, CheckCircle, Clock, Percent, GitCompare, Download, HelpCircle } from 'lucide-react';
import { exportToExcel, exportToPDF, SalesRepData, CanvasserData, CompanySummary, MonthlyProgress } from '@/lib/reportGenerator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AggregateMetrics {
  totalApprovedRevenue: number;
  totalPoints: number;
  totalLeads: number;
  totalClosedDeals: number;
  totalUsers: number;
}

interface CanvasserAggregates {
  totalCanvassers: number;
  totalLeadsSet: number;
  totalLeadsClosed: number;
  totalLeadsWithDamage: number;
  totalHoursWorked: number;
}

interface UserDetail {
  metricId: string;
  realUserId: string | null;
  name: string;
  approvedRevenue: number;
  collections: number;
  points: number;
  leads: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  earningsYtd: number;
  avgJobSize: number;
  leadToClosePercent: number;
  role: 'admin' | 'user' | 'canvasser';
  // Sub-component values for editing
  selfGeneratedDeals: number;
  canvassLeads: number;
  canvassDealsClose: number;
}

interface CanvasserDetail {
  metricId: string;
  realUserId: string | null;
  name: string;
  leadsSet: number;
  leadsClosed: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  conversationsHad: number;
  notInterested: number;
  hoursWorked: number;
  points: number;
  income: number;
  yearlyGoal: number;
  conversionRate: number;
  role: 'canvasser';
}

// Performance thresholds
const THRESHOLDS = {
  leadToClosePercent: { green: 60, yellow: 30 },
  avgJobSize: { green: 25000, yellow: 20000 },
  canvasserConversion: { green: 50, yellow: 25 },
};

export default function AdminOverview() {
  const [aggregates, setAggregates] = useState<AggregateMetrics>({
    totalApprovedRevenue: 0,
    totalPoints: 0,
    totalLeads: 0,
    totalClosedDeals: 0,
    totalUsers: 0,
  });
  const [canvasserAggregates, setCanvasserAggregates] = useState<CanvasserAggregates>({
    totalCanvassers: 0,
    totalLeadsSet: 0,
    totalLeadsClosed: 0,
    totalLeadsWithDamage: 0,
    totalHoursWorked: 0,
  });
  const [userDetails, setUserDetails] = useState<UserDetail[]>([]);
  const [canvasserDetails, setCanvasserDetails] = useState<CanvasserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCanvasserModalOpen, setEditCanvasserModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedCanvasser, setSelectedCanvasser] = useState<CanvasserDetail | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [companyGoals, setCompanyGoals] = useState<{
    salesRevenueGoal: number;
    canvasserLeadsGoal: number;
    targetLeadToCloseRatio: number;
    targetCostPerLead: number;
    fiscalYearStart: string;
    fiscalYearEnd: string;
  } | null>(null);
  const [totalCanvasserIncome, setTotalCanvasserIncome] = useState(0);

  const getLeadToCloseColor = (rate: number) => {
    if (rate >= THRESHOLDS.leadToClosePercent.green) return 'text-green-600 dark:text-green-400';
    if (rate >= THRESHOLDS.leadToClosePercent.yellow) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAvgJobSizeColor = (size: number) => {
    if (size >= THRESHOLDS.avgJobSize.green) return 'text-green-600 dark:text-green-400';
    if (size >= THRESHOLDS.avgJobSize.yellow) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCanvasserConversionColor = (rate: number) => {
    if (rate >= THRESHOLDS.canvasserConversion.green) return 'text-green-600 dark:text-green-400';
    if (rate >= THRESHOLDS.canvasserConversion.yellow) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const needsAttention = (user: UserDetail) => {
    return user.leadToClosePercent < THRESHOLDS.leadToClosePercent.yellow || 
           user.avgJobSize < THRESHOLDS.avgJobSize.yellow;
  };

  const canvasserNeedsAttention = (canvasser: CanvasserDetail) => {
    return canvasser.conversionRate < THRESHOLDS.canvasserConversion.yellow;
  };

  const fetchAdminData = async () => {
    // Fetch company goals
    const { data: goalsData } = await supabase
      .from('company_goals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (goalsData) {
      setCompanyGoals({
        salesRevenueGoal: Number(goalsData.sales_revenue_goal) || 0,
        canvasserLeadsGoal: Number(goalsData.canvasser_leads_goal) || 0,
        targetLeadToCloseRatio: Number(goalsData.target_lead_to_close_ratio) || 0,
        targetCostPerLead: Number(goalsData.target_cost_per_lead) || 0,
        fiscalYearStart: goalsData.fiscal_year_start || '2025-12-15',
        fiscalYearEnd: goalsData.fiscal_year_end || '2026-12-15',
      });
    }

    // Fetch all sales rep metrics - order by metric_date and updated_at for deterministic "latest" selection
    const { data: metrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('id, user_id, display_name, approved_revenue, collections, points, leads, closed_deals, yearly_goal, sales_rank, earnings_ytd, metric_date, updated_at, self_generated_leads, canvass_leads, self_generated_deals, canvass_deals_closed')
      .order('metric_date', { ascending: false })
      .order('updated_at', { ascending: false });

    if (metricsError) {
      console.error('Error fetching admin metrics:', metricsError);
    }

    // Fetch canvasser metrics - order by metric_date and updated_at for deterministic "latest" selection
    const { data: canvasserMetrics, error: canvasserError } = await supabase
      .from('canvasser_metrics')
      .select('id, user_id, display_name, leads_set, leads_closed, leads_with_damage, leads_without_damage, conversations_had, not_interested, hours_worked, points, income, yearly_goal, metric_date, updated_at')
      .order('metric_date', { ascending: false })
      .order('updated_at', { ascending: false });

    if (canvasserError) {
      console.error('Error fetching canvasser metrics:', canvasserError);
    }

    // Process sales rep data
    if (metrics && metrics.length > 0) {
      const latestByUser = new Map<string, { 
        metricId: string; 
        realUserId: string | null;
        approvedRevenue: number; 
        collections: number;
        points: number; 
        yearlyGoal: number; 
        salesRank: string; 
        displayName: string | null; 
        earningsYtd: number;
        canvassLeads: number;
        selfGeneratedDeals: number;
        canvassDealsClose: number;
      }>();
      
      for (const item of metrics) {
        const key = item.user_id || `metric_${item.id}`;
        if (!latestByUser.has(key)) {
          latestByUser.set(key, {
            metricId: item.id,
            realUserId: item.user_id,
            approvedRevenue: Number(item.approved_revenue) || 0,
            collections: Number(item.collections) || 0,
            points: Number(item.points) || 0,
            yearlyGoal: Number(item.yearly_goal) || 0,
            salesRank: item.sales_rank || 'SR1',
            displayName: item.display_name,
            earningsYtd: Number(item.earnings_ytd) || 0,
            canvassLeads: Number(item.canvass_leads) || 0,
            selfGeneratedDeals: Number(item.self_generated_deals) || 0,
            canvassDealsClose: Number(item.canvass_deals_closed) || 0,
          });
        }
      }

      const realUserIds = Array.from(latestByUser.values())
        .map(v => v.realUserId)
        .filter((id): id is string => id !== null);
      
      const { data: profilesData } = realUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', realUserIds)
        : { data: [] };

      const { data: rolesData } = realUserIds.length > 0
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', realUserIds)
        : { data: [] };

      const profilesMap = new Map<string, string | null>(
        profilesData?.map((p) => [p.id, p.full_name] as [string, string | null]) || []
      );

      const rolesMap = new Map<string, 'admin' | 'user' | 'canvasser'>();
      rolesData?.forEach((r) => {
        rolesMap.set(r.user_id, r.role as 'admin' | 'user' | 'canvasser');
      });

      const users: UserDetail[] = Array.from(latestByUser.entries()).map(([key, data]) => {
        // Total Leads = Canvass Leads only (self-gen leads removed)
        const calculatedLeads = data.canvassLeads;
        // Calculate Total Contracts = Self-Gen Deals + Canvass Deals
        const calculatedClosedDeals = data.selfGeneratedDeals + data.canvassDealsClose;
        
        const avgJobSize = calculatedClosedDeals > 0 ? data.approvedRevenue / calculatedClosedDeals : 0;
        // Lead-to-Close = Canvass Deals Closed / Canvass Leads Assigned
        const leadToClosePercent = data.canvassLeads > 0 ? (data.canvassDealsClose / data.canvassLeads) * 100 : 0;
        
        return {
          metricId: data.metricId,
          realUserId: data.realUserId,
          approvedRevenue: data.approvedRevenue,
          collections: data.collections,
          points: data.points,
          leads: calculatedLeads,
          closedDeals: calculatedClosedDeals,
          yearlyGoal: data.yearlyGoal,
          salesRank: data.salesRank,
          earningsYtd: data.earningsYtd,
          name: data.displayName || (data.realUserId ? profilesMap.get(data.realUserId) : null) || 'Unknown User',
          avgJobSize,
          leadToClosePercent,
          role: data.realUserId ? (rolesMap.get(data.realUserId) || 'user') : 'user',
          // Pass sub-component values for editing
          selfGeneratedDeals: data.selfGeneratedDeals,
          canvassLeads: data.canvassLeads,
          canvassDealsClose: data.canvassDealsClose,
        };
      });
      
      // Filter out canvassers from sales rep list
      const salesReps = users.filter(user => user.role !== 'canvasser');

      const totals = salesReps.reduce(
        (acc, user) => ({
          totalApprovedRevenue: acc.totalApprovedRevenue + user.approvedRevenue,
          totalPoints: acc.totalPoints + user.points,
          totalLeads: acc.totalLeads + user.leads,
          totalClosedDeals: acc.totalClosedDeals + user.closedDeals,
          totalUsers: acc.totalUsers + 1,
        }),
        { totalApprovedRevenue: 0, totalPoints: 0, totalLeads: 0, totalClosedDeals: 0, totalUsers: 0 }
      );

      setAggregates(totals);
      setUserDetails(salesReps.sort((a, b) => b.approvedRevenue - a.approvedRevenue));
    }

    // Process canvasser data
    if (canvasserMetrics && canvasserMetrics.length > 0) {
      const latestByCanvasser = new Map<string, {
        metricId: string;
        realUserId: string | null;
        displayName: string | null;
        leadsSet: number;
        leadsClosed: number;
        leadsWithDamage: number;
        leadsWithoutDamage: number;
        conversationsHad: number;
        notInterested: number;
        hoursWorked: number;
        points: number;
        income: number;
        yearlyGoal: number;
      }>();

      for (const item of canvasserMetrics) {
        const key = item.user_id || `metric_${item.id}`;
        if (!latestByCanvasser.has(key)) {
          latestByCanvasser.set(key, {
            metricId: item.id,
            realUserId: item.user_id,
            displayName: item.display_name,
            leadsSet: item.leads_set || 0,
            leadsClosed: item.leads_closed || 0,
            leadsWithDamage: item.leads_with_damage || 0,
            leadsWithoutDamage: Number((item as any).leads_without_damage) || 0,
            conversationsHad: Number((item as any).conversations_had) || 0,
            notInterested: Number((item as any).not_interested) || 0,
            hoursWorked: Number((item as any).hours_worked) || 0,
            points: Number(item.points) || 0,
            income: Number(item.income) || 0,
            yearlyGoal: item.yearly_goal || 0,
          });
        }
      }

      const canvassers: CanvasserDetail[] = Array.from(latestByCanvasser.entries()).map(([key, data]) => {
        const conversionRate = data.leadsSet > 0 ? (data.leadsClosed / data.leadsSet) * 100 : 0;
        
        return {
          metricId: data.metricId,
          realUserId: data.realUserId,
          name: data.displayName || 'Unknown Canvasser',
          leadsSet: data.leadsSet,
          leadsClosed: data.leadsClosed,
          leadsWithDamage: data.leadsWithDamage,
          leadsWithoutDamage: data.leadsWithoutDamage,
          conversationsHad: data.conversationsHad,
          notInterested: data.notInterested,
          hoursWorked: data.hoursWorked,
          points: data.points,
          income: data.income,
          yearlyGoal: data.yearlyGoal,
          conversionRate,
          role: 'canvasser' as const,
        };
      });

      const canvasserTotals = canvassers.reduce(
        (acc, c) => ({
          totalCanvassers: acc.totalCanvassers + 1,
          totalLeadsSet: acc.totalLeadsSet + c.leadsSet,
          totalLeadsClosed: acc.totalLeadsClosed + c.leadsClosed,
          totalLeadsWithDamage: acc.totalLeadsWithDamage + c.leadsWithDamage,
          totalHoursWorked: acc.totalHoursWorked + c.hoursWorked,
        }),
        { totalCanvassers: 0, totalLeadsSet: 0, totalLeadsClosed: 0, totalLeadsWithDamage: 0, totalHoursWorked: 0 }
      );

      const totalIncome = canvassers.reduce((sum, c) => sum + c.income, 0);
      setTotalCanvasserIncome(totalIncome);
      setCanvasserAggregates(canvasserTotals);
      setCanvasserDetails(canvassers.sort((a, b) => b.leadsSet - a.leadsSet));
    }

    setLoading(false);
  };

  // Generate monthly progress data for the graph
  const generateMonthlyProgress = (): MonthlyProgress[] => {
    const fiscalStart = companyGoals?.fiscalYearStart 
      ? new Date(companyGoals.fiscalYearStart) 
      : new Date(2025, 11, 15);
    
    const monthlyGoalRevenue = (companyGoals?.salesRevenueGoal || 0) / 12;
    const monthlyGoalLeads = (companyGoals?.canvasserLeadsGoal || 0) / 12;
    
    const now = new Date();
    const months: MonthlyProgress[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(fiscalStart, i);
      const monthName = format(monthDate, 'MMM yyyy');
      const isPast = monthDate <= now;
      
      // Distribute current totals proportionally for past months
      const monthsElapsed = Math.max(1, Math.floor((now.getTime() - fiscalStart.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      const monthlyRevenue = isPast ? aggregates.totalApprovedRevenue / Math.min(monthsElapsed, i + 1) : 0;
      const monthlyLeads = isPast ? Math.floor(canvasserAggregates.totalLeadsClosed / Math.min(monthsElapsed, i + 1)) : 0;
      
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

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleViewUser = (user: UserDetail) => {
    setSelectedUser(user);
    setViewModalOpen(true);
  };

  const handleEditUser = (user: UserDetail) => {
    setSelectedUser(user);
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  const handleEditCanvasser = (canvasser: CanvasserDetail) => {
    setSelectedCanvasser(canvasser);
    setEditCanvasserModalOpen(true);
  };

  const handleEditSuccess = () => {
    setLoading(true);
    fetchAdminData();
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user' | 'canvasser') => {
    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Role updated to ${newRole}`);
      setUserDetails(prev => 
        prev.map(u => u.realUserId === userId ? { ...u, role: newRole } : u)
      );
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setUpdatingRole(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const usersNeedingAttention = userDetails.filter(needsAttention);
  const canvassersNeedingAttention = canvasserDetails.filter(canvasserNeedsAttention);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading text-foreground">Master Overview</h2>
          <p className="text-muted-foreground">Manage all team members and their performance</p>
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
        const salesRepsData: SalesRepData[] = userDetails.map(u => ({
            name: u.name,
            salesRank: u.salesRank,
            approvedRevenue: u.approvedRevenue,
            collections: u.collections,
            earningsYtd: u.earningsYtd,
            points: u.points,
            leads: u.leads,
            closedDeals: u.closedDeals,
            yearlyGoal: u.yearlyGoal,
            avgJobSize: u.avgJobSize,
            leadToClosePercent: u.leadToClosePercent,
          }));
          const canvassersData: CanvasserData[] = canvasserDetails.map(c => ({
            name: c.name,
            leadsSet: c.leadsSet,
            leadsClosed: c.leadsClosed,
            leadsWithDamage: c.leadsWithDamage,
            hoursWorked: c.hoursWorked,
            points: c.points,
            income: c.income,
            conversionRate: c.conversionRate,
            yearlyGoal: c.yearlyGoal,
          }));
          
          const monthlyProgress = generateMonthlyProgress();
          const actualCostPerLead = canvasserAggregates.totalLeadsClosed > 0 
            ? totalCanvasserIncome / canvasserAggregates.totalLeadsClosed 
            : 0;
          
          const summary: CompanySummary = {
            totalApprovedRevenue: aggregates.totalApprovedRevenue,
            totalCollections: userDetails.reduce((sum, u) => sum + u.collections, 0),
            totalPoints: aggregates.totalPoints,
            totalLeads: aggregates.totalLeads,
            totalClosedDeals: aggregates.totalClosedDeals,
            salesRepCount: aggregates.totalUsers,
            canvasserCount: canvasserAggregates.totalCanvassers,
            companyLeadCloseRate: aggregates.totalLeads > 0 ? (aggregates.totalClosedDeals / aggregates.totalLeads) * 100 : 0,
            totalLeadsSet: canvasserAggregates.totalLeadsSet,
            totalLeadsClosed: canvasserAggregates.totalLeadsClosed,
            totalLeadsWithDamage: canvasserAggregates.totalLeadsWithDamage,
            totalHoursWorked: canvasserAggregates.totalHoursWorked,
            totalCanvasserIncome: totalCanvasserIncome,
            // Company Goals
            salesRevenueGoal: companyGoals?.salesRevenueGoal,
            canvasserLeadsGoal: companyGoals?.canvasserLeadsGoal,
            targetLeadToCloseRatio: companyGoals?.targetLeadToCloseRatio,
            targetCostPerLead: companyGoals?.targetCostPerLead,
            fiscalYearStart: companyGoals?.fiscalYearStart,
            fiscalYearEnd: companyGoals?.fiscalYearEnd,
            // Progress calculations
            salesProgressPercent: companyGoals?.salesRevenueGoal 
              ? (aggregates.totalApprovedRevenue / companyGoals.salesRevenueGoal) * 100 : 0,
            leadsProgressPercent: companyGoals?.canvasserLeadsGoal 
              ? (canvasserAggregates.totalLeadsClosed / companyGoals.canvasserLeadsGoal) * 100 : 0,
            actualCostPerLead: actualCostPerLead,
            // Monthly Progress for Graph
            monthlyProgress: monthlyProgress,
          };
          
          if (exportFormat === 'excel') {
            exportToExcel(salesRepsData, canvassersData, summary, { startDate, endDate });
            toast.success('Excel report downloaded');
          } else {
            exportToPDF(salesRepsData, canvassersData, summary, { startDate, endDate, includeGraph: true });
            toast.success('PDF report downloaded');
          }
        }}
      />

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sales">Sales Reps ({aggregates.totalUsers})</TabsTrigger>
          <TabsTrigger value="canvassers">Canvassers ({canvasserAggregates.totalCanvassers})</TabsTrigger>
        </TabsList>

        {/* Sales Reps Tab */}
        <TabsContent value="sales" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatsCard title="Total Users" value={aggregates.totalUsers} icon={UserCheck} />
            <StatsCard title="Total Approved Revenue" value={formatCurrency(aggregates.totalApprovedRevenue)} icon={DollarSign} />
            <StatsCard title="Total Points" value={aggregates.totalPoints.toLocaleString()} icon={Star} />
            <StatsCard title="Total Leads" value={aggregates.totalLeads} icon={Users} />
            <StatsCard title="Total Closed Deals" value={aggregates.totalClosedDeals} icon={Briefcase} />
            <StatsCard 
              title="Lead Close %" 
              value={`${aggregates.totalLeads > 0 ? ((aggregates.totalClosedDeals / aggregates.totalLeads) * 100).toFixed(1) : '0.0'}%`} 
              icon={Percent} 
            />
          </div>

          {/* Contract Source Comparison Card */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitCompare className="h-5 w-5 text-accent" />
              <h3 className="font-heading font-semibold text-foreground">Contract Sources</h3>
            </div>
            {(() => {
              // Calculate self-gen vs canvass contracts for yearly comparison
              const totalSelfGenContracts = userDetails.reduce((sum, u) => sum + u.selfGeneratedDeals, 0);
              const totalCanvassContracts = userDetails.reduce((sum, u) => sum + u.canvassDealsClose, 0);
              const totalContracts = totalSelfGenContracts + totalCanvassContracts;
              const selfGenPct = totalContracts > 0 ? (totalSelfGenContracts / totalContracts) * 100 : 0;
              const canvassPct = totalContracts > 0 ? (totalCanvassContracts / totalContracts) * 100 : 0;
              
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Self-Generated Contracts</span>
                    <span className="font-semibold text-foreground">{totalSelfGenContracts} ({selfGenPct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-accent h-2.5 rounded-full" 
                      style={{ width: `${selfGenPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Canvass Contracts</span>
                    <span className="font-semibold text-foreground">{totalCanvassContracts} ({canvassPct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${canvassPct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {usersNeedingAttention.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  {usersNeedingAttention.length} User{usersNeedingAttention.length > 1 ? 's' : ''} Need{usersNeedingAttention.length === 1 ? 's' : ''} Attention
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Users with Lead-to-Close % below 30% or Avg Job Size below $20k are highlighted below.
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-heading text-foreground">Sales Rep Performance</h3>
            </div>
            {userDetails.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No sales rep data available yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Rank</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Approved Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Collections</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">YTD Earnings</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Goal</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Points</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Leads</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Closed</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Avg Job</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 justify-end cursor-help">
                              Close %
                              <HelpCircle className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Lead-to-Close measures Canvass Contracts Closed divided by Canvass Leads Assigned</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetails.map((user) => {
                      const attention = needsAttention(user);
                      return (
                        <tr 
                          key={user.metricId}
                          className={cn(
                            "border-t border-border transition-colors",
                            attention ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"
                          )}
                        >
                          <td className="py-3 px-4 text-foreground font-medium">
                            <div className="flex items-center gap-2">
                              {user.name}
                              {attention && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Attention
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {user.realUserId ? (
                              <Select
                                value={user.role}
                                onValueChange={(value: 'admin' | 'user' | 'canvasser') => handleRoleChange(user.realUserId!, value)}
                                disabled={updatingRole === user.realUserId}
                              >
                                <SelectTrigger className={cn(
                                  "w-28 h-8",
                                  user.role === 'admin' ? "bg-primary/10 text-primary border-primary/30" : "bg-muted"
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border border-border z-50">
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="canvasser">Canvasser</SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-1">
                                      <Shield className="h-3 w-3" />
                                      Admin
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {user.salesRank}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-foreground">{formatCurrency(user.approvedRevenue)}</td>
                          <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(user.collections)}</td>
                          <td className="py-3 px-4 text-right text-foreground">{formatCurrency(user.earningsYtd)}</td>
                          <td className="py-3 px-4 text-right text-foreground">{formatCurrency(user.yearlyGoal)}</td>
                          <td className="py-3 px-4 text-right text-foreground">{user.points.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-foreground">{user.leads}</td>
                          <td className="py-3 px-4 text-right text-foreground">{user.closedDeals}</td>
                          <td className={cn("py-3 px-4 text-right font-medium", getAvgJobSizeColor(user.avgJobSize))}>
                            {formatCurrency(user.avgJobSize)}
                          </td>
                          <td className={cn("py-3 px-4 text-right font-medium", getLeadToCloseColor(user.leadToClosePercent))}>
                            {user.leadToClosePercent.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleViewUser(user)} title="View stats">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} title="Edit metrics">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Canvassers Tab */}
        <TabsContent value="canvassers" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatsCard title="Total Canvassers" value={canvasserAggregates.totalCanvassers} icon={UserCheck} />
            <StatsCard title="Leads Set" value={canvasserAggregates.totalLeadsSet} icon={Target} />
            <StatsCard title="Leads Closed" value={canvasserAggregates.totalLeadsClosed} icon={CheckCircle} />
            <StatsCard title="With Damage" value={canvasserAggregates.totalLeadsWithDamage} icon={AlertTriangle} />
            <StatsCard title="Hours Worked" value={canvasserAggregates.totalHoursWorked} icon={Clock} />
            <StatsCard 
              title="Lead Close %" 
              value={`${canvasserAggregates.totalLeadsSet > 0 ? ((canvasserAggregates.totalLeadsClosed / canvasserAggregates.totalLeadsSet) * 100).toFixed(1) : '0.0'}%`} 
              icon={Percent} 
            />
          </div>

          {canvassersNeedingAttention.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  {canvassersNeedingAttention.length} Canvasser{canvassersNeedingAttention.length > 1 ? 's' : ''} Need{canvassersNeedingAttention.length === 1 ? 's' : ''} Attention
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Canvassers with conversion rate below 25% are highlighted below.
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-heading text-foreground">Canvasser Performance</h3>
            </div>
            {canvasserDetails.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No canvasser data available yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Leads Set</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Leads Closed</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">With Damage</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Hours</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Points</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Conversion %</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canvasserDetails.map((canvasser) => {
                      const attention = canvasserNeedsAttention(canvasser);
                      return (
                        <tr 
                          key={canvasser.metricId}
                          className={cn(
                            "border-t border-border transition-colors",
                            attention ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"
                          )}
                        >
                          <td className="py-3 px-4 text-foreground font-medium">
                            <div className="flex items-center gap-2">
                              {canvasser.name}
                              {attention && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Attention
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-foreground">{canvasser.leadsSet}</td>
                          <td className="py-3 px-4 text-right text-foreground">{canvasser.leadsClosed}</td>
                          <td className="py-3 px-4 text-right text-foreground">{canvasser.leadsWithDamage}</td>
                          <td className="py-3 px-4 text-right text-foreground">{canvasser.hoursWorked}</td>
                          <td className="py-3 px-4 text-right text-foreground">{canvasser.points.toLocaleString()}</td>
                          <td className={cn("py-3 px-4 text-right font-medium", getCanvasserConversionColor(canvasser.conversionRate))}>
                            {canvasser.conversionRate.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditCanvasser(canvasser)} title="Edit metrics">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Point Activity Widget */}
      <RecentPointTransactionsWidget />

      <UserStatsModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        user={selectedUser}
        onEdit={() => handleEditUser(selectedUser!)}
      />

      <EditMetricsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onSuccess={handleEditSuccess}
      />

      <EditCanvasserMetricsModal
        open={editCanvasserModalOpen}
        onOpenChange={setEditCanvasserModalOpen}
        user={selectedCanvasser ? {
          metricId: selectedCanvasser.metricId,
          name: selectedCanvasser.name,
          leadsSet: selectedCanvasser.leadsSet,
          leadsClosed: selectedCanvasser.leadsClosed,
          leadsWithDamage: selectedCanvasser.leadsWithDamage,
          leadsWithoutDamage: selectedCanvasser.leadsWithoutDamage || 0,
          conversationsHad: selectedCanvasser.conversationsHad || 0,
          notInterested: selectedCanvasser.notInterested || 0,
          hoursWorked: selectedCanvasser.hoursWorked,
          points: selectedCanvasser.points,
          income: selectedCanvasser.income || 0,
          yearlyGoal: selectedCanvasser.yearlyGoal || 0,
        } : null}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}