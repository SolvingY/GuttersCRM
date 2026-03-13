import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { EditMetricsModal } from '@/components/dashboard/EditMetricsModal';
import { EditCanvasserMetricsModal } from '@/components/dashboard/EditCanvasserMetricsModal';
import { UserStatsModal } from '@/components/dashboard/UserStatsModal';
import { ReportDateRangeModal } from '@/components/dashboard/ReportDateRangeModal';
import { DollarSign, Star, Users, Briefcase, UserCheck, Loader2, Pencil, Eye, AlertTriangle, Shield, Target, CheckCircle, Clock, Percent, GitCompare, Download, HelpCircle, TrendingUp, ArrowRight, Trophy, BarChart3, Settings2, HardHat, Wrench } from 'lucide-react';
import { exportToExcel, exportToPDF, SalesRepData, CanvasserData, CompanySummary, MonthlyProgress } from '@/lib/reportGenerator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';
import { FISCAL_YEAR } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CanvasserConversionFunnel } from '@/components/canvasser/CanvasserConversionFunnel';
import { SectionCarousel } from '@/components/dashboard/SectionCarousel';
import { AccordionButton } from '@/components/dashboard/AccordionButton';
import { StaleContractsWidget } from '@/components/dashboard/StaleContractsWidget';
import { CollectionsPipelineWidget } from '@/components/dashboard/CollectionsPipelineWidget';
import { GoogleCalendarWidget } from '@/components/dashboard/GoogleCalendarWidget';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { WeeklyCanvasserLeaderboardTable } from '@/components/dashboard/WeeklyCanvasserLeaderboardTable';
import { ScoreboardSalesLeaderboard } from '@/components/dashboard/ScoreboardSalesLeaderboard';
import { ScoreboardCanvasserLeaderboard } from '@/components/dashboard/ScoreboardCanvasserLeaderboard';
import { useAdminDashboardPreferences } from '@/hooks/useAdminDashboardPreferences';
import { DashboardSettingsDrawer } from '@/components/admin/DashboardSettingsDrawer';

interface AggregateMetrics {
  totalApprovedRevenue: number;
  totalPoints: number;
  totalLeads: number;
  totalClosedDeals: number;
  totalUsers: number;
  totalSelfGen: number;
  totalCanvassClosedDeals: number;
  totalInternetClosedDeals: number;
  totalClosedForLtC: number;
}

interface CanvasserAggregates {
  totalCanvassers: number;
  totalLeadsSet: number;
  totalLeadsClosed: number;
  totalLeadsWithDamage: number;
  totalLeadsWithoutDamage: number;
  totalConversationsHad: number;
  totalNotInterested: number;
  totalDoorsKnocked: number;
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
  selfGeneratedDeals: number;
  canvassLeads: number;
  canvassDealsClose: number;
  internetLeads: number;
  internetLeadsClosed: number;
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
  doorsKnocked: number;
  points: number;
  income: number;
  yearlyGoal: number;
  conversionRate: number;
  revenue: number;
  role: 'canvasser';
}

interface ProductionDetail {
  metricId: string;
  realUserId: string;
  name: string;
  buildsCompleted: number;
  buildIssues: number;
  checklistsCompleted: number;
  buildEfficiency: number;
  hoursWorked: number;
  points: number;
}

interface ProductionAggregates {
  totalCrew: number;
  totalBuilds: number;
  totalIssues: number;
  totalChecklists: number;
  totalHoursWorked: number;
  avgEfficiency: number;
}

const THRESHOLDS = {
  leadToClosePercent: { green: 60, yellow: 30 },
  avgJobSize: { green: 25000, yellow: 20000 },
  canvasserConversion: { green: 50, yellow: 25 },
};

export default function AdminOverview() {
  const [aggregates, setAggregates] = useState<AggregateMetrics>({
    totalApprovedRevenue: 0, totalPoints: 0, totalLeads: 0, totalClosedDeals: 0,
    totalUsers: 0, totalSelfGen: 0, totalCanvassClosedDeals: 0, totalInternetClosedDeals: 0, totalClosedForLtC: 0,
  });
  const [canvasserAggregates, setCanvasserAggregates] = useState<CanvasserAggregates>({
    totalCanvassers: 0, totalLeadsSet: 0, totalLeadsClosed: 0, totalLeadsWithDamage: 0,
    totalLeadsWithoutDamage: 0, totalConversationsHad: 0, totalNotInterested: 0,
    totalDoorsKnocked: 0, totalHoursWorked: 0,
  });
  const [userDetails, setUserDetails] = useState<UserDetail[]>([]);
  const [canvasserDetails, setCanvasserDetails] = useState<CanvasserDetail[]>([]);
  const [productionAggregates, setProductionAggregates] = useState<ProductionAggregates>({
    totalCrew: 0, totalBuilds: 0, totalIssues: 0, totalChecklists: 0, totalHoursWorked: 0, avgEfficiency: 0,
  });
  const [productionDetails, setProductionDetails] = useState<ProductionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCanvasserModalOpen, setEditCanvasserModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedCanvasser, setSelectedCanvasser] = useState<CanvasserDetail | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [companyGoals, setCompanyGoals] = useState<{
    salesRevenueGoal: number; canvasserLeadsGoal: number;
    targetLeadToCloseRatio: number; targetCostPerLead: number;
    fiscalYearStart: string; fiscalYearEnd: string;
  } | null>(null);
  const [totalCanvasserIncome, setTotalCanvasserIncome] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openSubSection, setOpenSubSection] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config: widgetConfig, isWidgetVisible, savePreferences } = useAdminDashboardPreferences();
  const toggleSection = (id: string) => {
    setOpenSection(prev => prev === id ? null : id);
    setOpenSubSection(null);
  };
  const toggleSubSection = (id: string) => setOpenSubSection(prev => prev === id ? null : id);

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

    const { data: metrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('id, user_id, display_name, approved_revenue, collections, points, leads, closed_deals, yearly_goal, sales_rank, earnings_ytd, metric_date, updated_at, self_generated_leads, canvass_leads, self_generated_deals, canvass_deals_closed, internet_leads, internet_leads_closed')
      .order('metric_date', { ascending: false })
      .order('updated_at', { ascending: false });

    if (metricsError) {
      console.error('Error fetching admin metrics:', metricsError);
    }

    // Fetch config fields from canvasser_metrics (display_name, yearly_goal, income, points)
    const { data: canvasserConfigRows } = await supabase
      .from('canvasser_metrics')
      .select('id, user_id, display_name, yearly_goal, points, income, metric_date, updated_at')
      .order('metric_date', { ascending: false })
      .order('updated_at', { ascending: false });

    // Aggregate performance from daily entries
    const fiscalStartStr = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');
    const { data: dailyCanvasserEntries, error: canvasserError } = await supabase
      .from('daily_canvasser_metric_entries')
      .select('*')
      .gte('entry_date', fiscalStartStr);

    if (canvasserError) {
      console.error('Error fetching canvasser daily entries:', canvasserError);
    }

    // Sum daily deltas per user
    const dailySumsByUser = new Map<string, {
      leadsSet: number; leadsClosed: number; leadsWithDamage: number;
      leadsWithoutDamage: number; conversationsHad: number; notInterested: number;
      hoursWorked: number; doorsKnocked: number; income: number;
    }>();
    for (const e of (dailyCanvasserEntries || [])) {
      const existing = dailySumsByUser.get(e.user_id) || {
        leadsSet: 0, leadsClosed: 0, leadsWithDamage: 0, leadsWithoutDamage: 0,
        conversationsHad: 0, notInterested: 0, hoursWorked: 0, doorsKnocked: 0, income: 0,
      };
      existing.leadsSet += e.leads_set_delta || 0;
      existing.leadsClosed += e.leads_closed_delta || 0;
      existing.leadsWithDamage += e.leads_with_damage_delta || 0;
      existing.leadsWithoutDamage += e.leads_without_damage_delta || 0;
      existing.conversationsHad += e.conversations_had_delta || 0;
      existing.notInterested += e.not_interested_delta || 0;
      existing.hoursWorked += Number(e.hours_worked_delta || 0);
      existing.doorsKnocked += e.doors_knocked_delta || 0;
      existing.income += Number(e.income_delta || 0);
      dailySumsByUser.set(e.user_id, existing);
    }

    if (metrics && metrics.length > 0) {
      const latestByUser = new Map<string, { 
        metricId: string; realUserId: string | null;
        approvedRevenue: number; collections: number; points: number; yearlyGoal: number; 
        salesRank: string; displayName: string | null; earningsYtd: number;
        canvassLeads: number; selfGeneratedDeals: number; canvassDealsClose: number;
        internetLeads: number; internetLeadsClosed: number;
      }>();
      
      for (const item of metrics) {
        const key = item.user_id || `metric_${item.id}`;
        if (!latestByUser.has(key)) {
          latestByUser.set(key, {
            metricId: item.id, realUserId: item.user_id,
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
            internetLeads: Number((item as any).internet_leads) || 0,
            internetLeadsClosed: Number((item as any).internet_leads_closed) || 0,
          });
        }
      }

      const realUserIds = Array.from(latestByUser.values())
        .map(v => v.realUserId)
        .filter((id): id is string => id !== null);
      
      const { data: profilesData } = realUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, is_archived').in('id', realUserIds)
        : { data: [] };

      const { data: rolesData } = realUserIds.length > 0
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', realUserIds)
        : { data: [] };

      const profilesMap = new Map<string, string | null>(
        profilesData?.map((p) => [p.id, p.full_name] as [string, string | null]) || []
      );

      const activeIds = new Set<string>(
        profilesData?.filter(p => !p.is_archived).map(p => p.id) || []
      );

      const rolesMap = new Map<string, 'admin' | 'user' | 'canvasser'>();
      const rolePriority: Record<string, number> = { admin: 3, user: 2, canvasser: 1 };
      
      rolesData?.forEach((r) => {
        const currentRole = rolesMap.get(r.user_id);
        const newRole = r.role as 'admin' | 'user' | 'canvasser';
        if (!currentRole || rolePriority[newRole] > rolePriority[currentRole]) {
          rolesMap.set(r.user_id, newRole);
        }
      });

      const { data: liveLeads } = await supabase
        .from('quote_requests')
        .select('assigned_to, status')
        .not('assigned_to', 'is', null)
        .is('archived_at', null)
        .is('cancelled_at', null);

      const liveLeadsByRep = new Map<string, { total: number; closed: number }>();
      if (liveLeads) {
        for (const lead of liveLeads) {
          const rid = lead.assigned_to!;
          if (!liveLeadsByRep.has(rid)) liveLeadsByRep.set(rid, { total: 0, closed: 0 });
          const entry = liveLeadsByRep.get(rid)!;
          entry.total++;
          if (['won', 'scheduled', 'completed'].includes(lead.status)) {
            entry.closed++;
          }
        }
      }

      const users: UserDetail[] = Array.from(latestByUser.entries()).map(([key, data]) => {
        const calculatedClosedDeals = data.selfGeneratedDeals + data.canvassDealsClose + data.internetLeadsClosed;
        const avgJobSize = calculatedClosedDeals > 0 ? data.approvedRevenue / calculatedClosedDeals : 0;
        const liveCounts = data.realUserId ? liveLeadsByRep.get(data.realUserId) : null;
        const realLeads = liveCounts?.total || 0;
        const realClosed = liveCounts?.closed || 0;
        const leadToClosePercent = realLeads > 0 ? (realClosed / realLeads) * 100 : 0;
        
        return {
          metricId: data.metricId, realUserId: data.realUserId,
          approvedRevenue: data.approvedRevenue, collections: data.collections,
          points: data.points, leads: realLeads, closedDeals: calculatedClosedDeals,
          yearlyGoal: data.yearlyGoal, salesRank: data.salesRank,
          earningsYtd: data.earningsYtd,
          name: data.displayName || (data.realUserId ? profilesMap.get(data.realUserId) : null) || 'Unknown User',
          avgJobSize, leadToClosePercent,
          role: data.realUserId ? (rolesMap.get(data.realUserId) || 'user') : 'user',
          selfGeneratedDeals: data.selfGeneratedDeals,
          canvassLeads: data.canvassLeads,
          canvassDealsClose: data.canvassDealsClose,
          internetLeads: data.internetLeads,
          internetLeadsClosed: data.internetLeadsClosed,
        };
      });
      
      const salesReps = users.filter(user => user.role !== 'canvasser');

      const totals = salesReps.reduce(
        (acc, user) => ({
          totalApprovedRevenue: acc.totalApprovedRevenue + user.approvedRevenue,
          totalPoints: acc.totalPoints + user.points,
          totalLeads: acc.totalLeads + user.leads,
          totalClosedDeals: acc.totalClosedDeals + user.closedDeals,
          totalUsers: acc.totalUsers + 1,
          totalSelfGen: acc.totalSelfGen + user.selfGeneratedDeals,
          totalCanvassClosedDeals: acc.totalCanvassClosedDeals + user.canvassDealsClose,
          totalInternetClosedDeals: acc.totalInternetClosedDeals + user.internetLeadsClosed,
          totalClosedForLtC: acc.totalClosedForLtC + (liveLeadsByRep.get(user.realUserId || '')?.closed || 0),
        }),
        { totalApprovedRevenue: 0, totalPoints: 0, totalLeads: 0, totalClosedDeals: 0, totalUsers: 0, totalSelfGen: 0, totalCanvassClosedDeals: 0, totalInternetClosedDeals: 0, totalClosedForLtC: 0 }
      );

      setAggregates(totals);
      const activeSalesReps = salesReps.filter(user => user.realUserId && activeIds.has(user.realUserId));
      setUserDetails(activeSalesReps.sort((a, b) => a.name.localeCompare(b.name)));
    }

    // Build canvasser config map from canvasser_metrics (latest per user)
    const latestConfigByCanvasser = new Map<string, {
      metricId: string; realUserId: string | null; displayName: string | null;
      points: number; income: number; yearlyGoal: number;
    }>();
    if (canvasserConfigRows) {
      for (const item of canvasserConfigRows) {
        const key = item.user_id || `metric_${item.id}`;
        if (!latestConfigByCanvasser.has(key)) {
          latestConfigByCanvasser.set(key, {
            metricId: item.id, realUserId: item.user_id, displayName: item.display_name,
            points: Number(item.points) || 0,
            income: Number(item.income) || 0,
            yearlyGoal: item.yearly_goal || 0,
          });
        }
      }
    }

    // Merge: all user_ids from both config and daily sums
    const allCanvasserKeys = new Set([
      ...Array.from(latestConfigByCanvasser.keys()),
      ...Array.from(dailySumsByUser.keys()),
    ]);

    if (allCanvasserKeys.size > 0) {

      const canvasserUserIds = Array.from(new Set([
        ...Array.from(latestConfigByCanvasser.values()).map(v => v.realUserId).filter((id): id is string => id !== null),
        ...Array.from(dailySumsByUser.keys()),
      ]));
      
      const { data: canvasserProfilesData } = canvasserUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', canvasserUserIds)
        : { data: [] };

      const canvasserProfilesMap = new Map<string, string>(
        canvasserProfilesData?.filter(p => p.full_name).map(p => [p.id, p.full_name as string]) || []
      );

      const canvassers: CanvasserDetail[] = canvasserUserIds.map((userId) => {
        const config = latestConfigByCanvasser.get(userId);
        const perf = dailySumsByUser.get(userId) || {
          leadsSet: 0, leadsClosed: 0, leadsWithDamage: 0, leadsWithoutDamage: 0,
          conversationsHad: 0, notInterested: 0, hoursWorked: 0, doorsKnocked: 0, income: 0,
        };
        const conversionRate = perf.leadsSet > 0 ? (perf.leadsClosed / perf.leadsSet) * 100 : 0;
        return {
          metricId: config?.metricId || userId, realUserId: userId,
          name: config?.displayName || canvasserProfilesMap.get(userId) || 'Unknown Canvasser',
          leadsSet: perf.leadsSet, leadsClosed: perf.leadsClosed,
          leadsWithDamage: perf.leadsWithDamage, leadsWithoutDamage: perf.leadsWithoutDamage,
          conversationsHad: perf.conversationsHad, notInterested: perf.notInterested,
          hoursWorked: perf.hoursWorked, doorsKnocked: perf.doorsKnocked,
          points: config?.points || 0, income: Math.max(0, perf.income), yearlyGoal: config?.yearlyGoal || 0,
          conversionRate, revenue: 0, role: 'canvasser' as const,
        };
      });

      const { data: revenueData } = await supabase
        .from("quote_requests")
        .select("canvasser_id, quote_amount")
        .in("status", ["won", "scheduled", "completed"])
        .not("canvasser_id", "is", null)
        .gte("created_at", FISCAL_YEAR.CURRENT_YEAR_START.toISOString());

      const revenueByCanvasser = new Map<string, number>();
      revenueData?.forEach((lead: any) => {
        const current = revenueByCanvasser.get(lead.canvasser_id) || 0;
        revenueByCanvasser.set(lead.canvasser_id, current + (Number(lead.quote_amount) || 0));
      });

      canvassers.forEach(c => {
        if (c.realUserId) {
          c.revenue = revenueByCanvasser.get(c.realUserId) || 0;
        }
      });

      const activeCanvassers = canvassers.filter(c => c.realUserId);

      const canvasserTotals = activeCanvassers.reduce(
        (acc, c) => ({
          totalCanvassers: acc.totalCanvassers + 1,
          totalLeadsSet: acc.totalLeadsSet + c.leadsSet,
          totalLeadsClosed: acc.totalLeadsClosed + c.leadsClosed,
          totalLeadsWithDamage: acc.totalLeadsWithDamage + c.leadsWithDamage,
          totalLeadsWithoutDamage: acc.totalLeadsWithoutDamage + c.leadsWithoutDamage,
          totalConversationsHad: acc.totalConversationsHad + c.conversationsHad,
          totalNotInterested: acc.totalNotInterested + c.notInterested,
          totalDoorsKnocked: acc.totalDoorsKnocked + c.doorsKnocked,
          totalHoursWorked: acc.totalHoursWorked + c.hoursWorked,
        }),
        { totalCanvassers: 0, totalLeadsSet: 0, totalLeadsClosed: 0, totalLeadsWithDamage: 0, 
          totalLeadsWithoutDamage: 0, totalConversationsHad: 0, totalNotInterested: 0, 
          totalDoorsKnocked: 0, totalHoursWorked: 0 }
      );

      const totalIncome = activeCanvassers.reduce((sum, c) => sum + c.income, 0);
      setTotalCanvasserIncome(totalIncome);
      setCanvasserAggregates(canvasserTotals);
      setCanvasserDetails(activeCanvassers.sort((a, b) => a.name.localeCompare(b.name)));
    }

    // ── Production data ──
    const fiscalStartStr2 = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');

    // Get production role user IDs
    const { data: productionRoleRows } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'production');

    const productionUserIds = productionRoleRows?.map(r => r.user_id) || [];

    if (productionUserIds.length > 0) {
      // Filter to active (non-archived) profiles
      const { data: prodProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, is_archived')
        .in('id', productionUserIds);

      const activeProdIds = new Set(prodProfiles?.filter(p => !p.is_archived).map(p => p.id) || []);
      const prodProfileMap = new Map(prodProfiles?.map(p => [p.id, p.full_name]) || []);

      // Get latest production_metrics per user
      const { data: prodMetrics } = await supabase
        .from('production_metrics')
        .select('id, user_id, display_name, builds_completed, build_issues, checklists_completed, build_efficiency, points, metric_date, updated_at')
        .in('user_id', Array.from(activeProdIds))
        .order('metric_date', { ascending: false })
        .order('updated_at', { ascending: false });

      const latestProdByUser = new Map<string, typeof prodMetrics extends (infer T)[] | null ? T : never>();
      for (const m of (prodMetrics || [])) {
        if (!latestProdByUser.has(m.user_id)) latestProdByUser.set(m.user_id, m);
      }

      // Aggregate hours from daily_production_metric_entries
      const { data: prodDailyEntries } = await supabase
        .from('daily_production_metric_entries')
        .select('user_id, builds_completed_delta, build_issues_delta, checklists_completed_delta')
        .in('user_id', Array.from(activeProdIds))
        .gte('entry_date', fiscalStartStr2);

      // Also get hours from production_shifts
      const { data: prodShifts } = await supabase
        .from('production_shifts')
        .select('user_id, hours_worked')
        .in('user_id', Array.from(activeProdIds))
        .gte('clock_in_at', FISCAL_YEAR.CURRENT_YEAR_START.toISOString());

      const hoursByUser = new Map<string, number>();
      for (const s of (prodShifts || [])) {
        hoursByUser.set(s.user_id, (hoursByUser.get(s.user_id) || 0) + Number((s as any).hours_worked || 0));
      }

      const prodDetails: ProductionDetail[] = Array.from(activeProdIds).map(userId => {
        const m = latestProdByUser.get(userId);
        const hours = hoursByUser.get(userId) || 0;
        return {
          metricId: m?.id || userId,
          realUserId: userId,
          name: m?.display_name || prodProfileMap.get(userId) || 'Unknown',
          buildsCompleted: Number(m?.builds_completed) || 0,
          buildIssues: Number(m?.build_issues) || 0,
          checklistsCompleted: Number(m?.checklists_completed) || 0,
          buildEfficiency: Number(m?.build_efficiency) || 0,
          hoursWorked: Math.round(hours * 10) / 10,
          points: Number(m?.points) || 0,
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      const totalBuilds = prodDetails.reduce((s, d) => s + d.buildsCompleted, 0);
      const totalIssues = prodDetails.reduce((s, d) => s + d.buildIssues, 0);
      const totalChecklists = prodDetails.reduce((s, d) => s + d.checklistsCompleted, 0);
      const totalProdHours = prodDetails.reduce((s, d) => s + d.hoursWorked, 0);
      const avgEff = prodDetails.length > 0
        ? prodDetails.reduce((s, d) => s + d.buildEfficiency, 0) / prodDetails.length
        : 0;

      setProductionAggregates({
        totalCrew: prodDetails.length,
        totalBuilds, totalIssues, totalChecklists,
        totalHoursWorked: Math.round(totalProdHours * 10) / 10,
        avgEfficiency: Math.round(avgEff * 10) / 10,
      });
      setProductionDetails(prodDetails);
    }

    setLoading(false);
  };

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

    // Realtime subscription: refetch when canvasser_metrics change
    const channel = supabase
      .channel('admin-canvasser-metrics-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canvasser_metrics' }, () => {
        fetchAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_metrics' }, () => {
        fetchAdminData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  };

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
          <h2 className="text-2xl font-heading text-foreground">Master Overview</h2>
          <p className="text-muted-foreground">Manage all team members and their performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setReportModalOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="Customize dashboard"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ReportDateRangeModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onExport={(startDate, endDate, exportFormat, reportType) => {
          const salesRepsData: SalesRepData[] = reportType === 'canvassers' ? [] : userDetails.map(u => ({
            name: u.name, salesRank: u.salesRank, approvedRevenue: u.approvedRevenue,
            collections: u.collections, earningsYtd: u.earningsYtd, points: u.points,
            leads: u.leads, closedDeals: u.closedDeals, yearlyGoal: u.yearlyGoal,
            avgJobSize: u.avgJobSize, leadToClosePercent: u.leadToClosePercent,
          }));
          const canvassersData: CanvasserData[] = reportType === 'sales' ? [] : canvasserDetails.map(c => ({
            name: c.name, leadsSet: c.leadsSet, leadsClosed: c.leadsClosed,
            leadsWithDamage: c.leadsWithDamage, hoursWorked: c.hoursWorked,
            doorsKnocked: c.doorsKnocked, conversationsHad: c.conversationsHad,
            notInterested: c.notInterested, points: c.points, income: c.income,
            conversionRate: c.conversionRate, yearlyGoal: c.yearlyGoal,
          }));
          
          const monthlyProgress = generateMonthlyProgress();
          const actualCostPerLead = canvasserAggregates.totalLeadsClosed > 0 
            ? totalCanvasserIncome / canvasserAggregates.totalLeadsClosed : 0;
          
          const summary: CompanySummary = {
            totalApprovedRevenue: aggregates.totalApprovedRevenue,
            totalCollections: userDetails.reduce((sum, u) => sum + u.collections, 0),
            totalPoints: aggregates.totalPoints,
            totalLeads: aggregates.totalLeads,
            totalClosedDeals: aggregates.totalClosedDeals,
            salesRepCount: reportType === 'canvassers' ? 0 : aggregates.totalUsers,
            canvasserCount: reportType === 'sales' ? 0 : canvasserAggregates.totalCanvassers,
            companyLeadCloseRate: aggregates.totalLeads > 0 ? (aggregates.totalClosedDeals / aggregates.totalLeads) * 100 : 0,
            totalLeadsSet: canvasserAggregates.totalLeadsSet,
            totalLeadsClosed: canvasserAggregates.totalLeadsClosed,
            totalLeadsWithDamage: canvasserAggregates.totalLeadsWithDamage,
            totalHoursWorked: canvasserAggregates.totalHoursWorked,
            totalCanvasserIncome: totalCanvasserIncome,
            salesRevenueGoal: companyGoals?.salesRevenueGoal,
            canvasserLeadsGoal: companyGoals?.canvasserLeadsGoal,
            targetLeadToCloseRatio: companyGoals?.targetLeadToCloseRatio,
            targetCostPerLead: companyGoals?.targetCostPerLead,
            fiscalYearStart: companyGoals?.fiscalYearStart,
            fiscalYearEnd: companyGoals?.fiscalYearEnd,
            salesProgressPercent: companyGoals?.salesRevenueGoal 
              ? (aggregates.totalApprovedRevenue / companyGoals.salesRevenueGoal) * 100 : 0,
            leadsProgressPercent: companyGoals?.canvasserLeadsGoal 
              ? (canvasserAggregates.totalLeadsClosed / companyGoals.canvasserLeadsGoal) * 100 : 0,
            actualCostPerLead: actualCostPerLead,
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

      {isWidgetVisible('stale_contracts') && <StaleContractsWidget isAdmin={true} />}

      {/* Main SectionCarousel replacing Tabs */}
      <SectionCarousel activeSection={openSection} onToggle={toggleSection}>
        {/* Sales Reps */}
        <SectionCarousel.Item id="sales" title={`Sales Reps (${aggregates.totalUsers})`} icon={UserCheck}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <StatsCard title="Total Sales Reps" value={aggregates.totalUsers} icon={UserCheck} />
              <StatsCard title="Approved Revenue" value={formatCurrency(aggregates.totalApprovedRevenue)} icon={DollarSign} />
              <StatsCard title="Total Points" value={aggregates.totalPoints.toLocaleString()} icon={Star} />
              <StatsCard title="Total Leads (Close %)" value={aggregates.totalLeads} icon={Users} />
              <StatsCard title="Total Contracts" value={aggregates.totalClosedDeals} icon={Briefcase} />
              <StatsCard 
                title="Lead Close %" 
                value={`${aggregates.totalLeads > 0 ? ((aggregates.totalClosedForLtC / aggregates.totalLeads) * 100).toFixed(1) : '0.0'}%`} 
                icon={Percent} 
              />
            </div>

            {isWidgetVisible('collections_pipeline') && <CollectionsPipelineWidget isAdmin={true} />}

            <div className="space-y-3">
              {isWidgetVisible('sales_details') && (
              <AccordionButton id="sales-details" title="Detailed Stats" icon={Eye} isOpen={openSubSection === 'sales-details'} onToggle={toggleSubSection}>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                                    <p>Lead-to-Close = (Canvass Closed + Internet Closed) / (Canvass Leads + Internet Leads)</p>
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
              </AccordionButton>
              )}

              {isWidgetVisible('contract_sources') && (
              <AccordionButton id="contract-sources" title="Contract Sources" icon={GitCompare} isOpen={openSubSection === 'contract-sources'} onToggle={toggleSubSection}>
                {(() => {
                  const totalSelfGenContracts = aggregates.totalSelfGen;
                  const totalCanvassContracts = aggregates.totalCanvassClosedDeals;
                  const totalInternetContracts = aggregates.totalInternetClosedDeals;
                  const totalContracts = totalSelfGenContracts + totalCanvassContracts + totalInternetContracts;
                  const selfGenPct = totalContracts > 0 ? (totalSelfGenContracts / totalContracts) * 100 : 0;
                  const canvassPct = totalContracts > 0 ? (totalCanvassContracts / totalContracts) * 100 : 0;
                  const internetPct = totalContracts > 0 ? (totalInternetContracts / totalContracts) * 100 : 0;
                  
                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Self-Generated</span>
                          <span className="font-semibold text-foreground">{totalSelfGenContracts} ({selfGenPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${selfGenPct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Does not count toward Close %</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Canvass Contracts</span>
                          <span className="font-semibold text-foreground">{totalCanvassContracts} ({canvassPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                          <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${canvassPct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Counts toward Close %</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Internet Contracts</span>
                          <span className="font-semibold text-foreground">{totalInternetContracts} ({internetPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                          <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${internetPct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Counts toward Close %</p>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>Total Contracts</span>
                          <span>{totalContracts}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </AccordionButton>
              )}

              {isWidgetVisible('sales_leaderboard') && (
              <AccordionButton id="sales-leaderboard" title="Sales Leaderboard" icon={Trophy} isOpen={openSubSection === 'sales-leaderboard'} onToggle={toggleSubSection}>
                <ScoreboardSalesLeaderboard ytdUserDetails={userDetails} />
              </AccordionButton>
              )}
            </div>
          </div>
        </SectionCarousel.Item>

        {/* Canvassers */}
        <SectionCarousel.Item id="canvassers" title={`Canvassers (${canvasserAggregates.totalCanvassers})`} icon={Users}>
          <div className="space-y-6">
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

            <div className="space-y-3">
              {isWidgetVisible('canvasser_details') && (
              <AccordionButton id="canvasser-details" title="Detailed Stats" icon={Eye} isOpen={openSubSection === 'canvasser-details'} onToggle={toggleSubSection}>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">YTD Income</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Revenue</th>
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
                                <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(canvasser.income)}</td>
                                <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(canvasser.revenue)}</td>
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
              </AccordionButton>
              )}

              {isWidgetVisible('conversion_funnel') && (
              <AccordionButton id="conversion-funnel" title="Team Conversion Funnel" icon={TrendingUp} isOpen={openSubSection === 'conversion-funnel'} onToggle={toggleSubSection}>
                <CanvasserConversionFunnel
                  title="Team Conversion Funnel (YTD)"
                  data={{
                    doorsKnocked: canvasserAggregates.totalDoorsKnocked,
                    conversationsHad: canvasserAggregates.totalConversationsHad,
                    leadsSet: canvasserAggregates.totalLeadsSet,
                    leadsWithDamage: canvasserAggregates.totalLeadsWithDamage,
                    leadsWithoutDamage: canvasserAggregates.totalLeadsWithoutDamage,
                    leadsClosed: canvasserAggregates.totalLeadsClosed,
                  }} 
                />
              </AccordionButton>
              )}

              {isWidgetVisible('canvasser_leaderboard') && (
              <AccordionButton id="canvasser-leaderboard" title="Canvasser Leaderboard" icon={BarChart3} isOpen={openSubSection === 'canvasser-leaderboard'} onToggle={toggleSubSection}>
                <ScoreboardCanvasserLeaderboard ytdCanvasserDetails={canvasserDetails} />
              </AccordionButton>
              )}
            </div>
          </div>
        </SectionCarousel.Item>

        {/* Supplementers */}
        <SectionCarousel.Item id="supplementers" title="Supplementers" icon={Briefcase}>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Supplementer data is managed on the Supplementer dashboard.</p>
          </div>
        </SectionCarousel.Item>

      </SectionCarousel>

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

      <GoogleCalendarWidget />

      <DashboardSettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={widgetConfig}
        onSave={savePreferences}
      />
    </div>
  );
}
