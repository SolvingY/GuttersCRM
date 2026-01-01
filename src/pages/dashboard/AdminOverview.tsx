import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { EditMetricsModal } from '@/components/dashboard/EditMetricsModal';
import { EditCanvasserMetricsModal } from '@/components/dashboard/EditCanvasserMetricsModal';
import { UserStatsModal } from '@/components/dashboard/UserStatsModal';
import { DollarSign, Star, Users, Briefcase, UserCheck, Loader2, Pencil, Eye, AlertTriangle, Shield, Target, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface AggregateMetrics {
  totalSales: number;
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
  totalShiftsWorked: number;
}

interface UserDetail {
  metricId: string;
  realUserId: string | null;
  name: string;
  sales: number;
  points: number;
  leads: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  earningsYtd: number;
  avgJobSize: number;
  leadToClosePercent: number;
  role: 'admin' | 'user' | 'canvasser';
}

interface CanvasserDetail {
  metricId: string;
  realUserId: string | null;
  name: string;
  leadsSet: number;
  leadsClosed: number;
  leadsWithDamage: number;
  shiftsWorked: number;
  points: number;
  income: number;
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
    totalSales: 0,
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
    totalShiftsWorked: 0,
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
    // Fetch all sales rep metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('id, user_id, display_name, sales, points, leads, closed_deals, yearly_goal, sales_rank, earnings_ytd, metric_date')
      .order('metric_date', { ascending: false });

    if (metricsError) {
      console.error('Error fetching admin metrics:', metricsError);
    }

    // Fetch canvasser metrics
    const { data: canvasserMetrics, error: canvasserError } = await supabase
      .from('canvasser_metrics')
      .select('id, user_id, display_name, leads_set, leads_closed, leads_with_damage, shifts_worked, points, metric_date')
      .order('metric_date', { ascending: false });

    if (canvasserError) {
      console.error('Error fetching canvasser metrics:', canvasserError);
    }

    // Process sales rep data
    if (metrics && metrics.length > 0) {
      const latestByUser = new Map<string, { 
        metricId: string; 
        realUserId: string | null;
        sales: number; 
        points: number; 
        leads: number; 
        closedDeals: number; 
        yearlyGoal: number; 
        salesRank: string; 
        displayName: string | null; 
        earningsYtd: number; 
      }>();
      
      for (const item of metrics) {
        const key = item.user_id || `metric_${item.id}`;
        if (!latestByUser.has(key)) {
          latestByUser.set(key, {
            metricId: item.id,
            realUserId: item.user_id,
            sales: Number(item.sales) || 0,
            points: Number(item.points) || 0,
            leads: item.leads || 0,
            closedDeals: item.closed_deals || 0,
            yearlyGoal: Number(item.yearly_goal) || 0,
            salesRank: item.sales_rank || 'SR1',
            displayName: item.display_name,
            earningsYtd: Number(item.earnings_ytd) || 0,
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
        const avgJobSize = data.closedDeals > 0 ? data.sales / data.closedDeals : 0;
        const leadToClosePercent = data.leads > 0 ? (data.closedDeals / data.leads) * 100 : 0;
        
        return {
          metricId: data.metricId,
          realUserId: data.realUserId,
          sales: data.sales,
          points: data.points,
          leads: data.leads,
          closedDeals: data.closedDeals,
          yearlyGoal: data.yearlyGoal,
          salesRank: data.salesRank,
          earningsYtd: data.earningsYtd,
          name: data.displayName || (data.realUserId ? profilesMap.get(data.realUserId) : null) || 'Unknown User',
          avgJobSize,
          leadToClosePercent,
          role: data.realUserId ? (rolesMap.get(data.realUserId) || 'user') : 'user',
        };
      });
      
      const totals = users.reduce(
        (acc, user) => ({
          totalSales: acc.totalSales + user.sales,
          totalPoints: acc.totalPoints + user.points,
          totalLeads: acc.totalLeads + user.leads,
          totalClosedDeals: acc.totalClosedDeals + user.closedDeals,
          totalUsers: acc.totalUsers + 1,
        }),
        { totalSales: 0, totalPoints: 0, totalLeads: 0, totalClosedDeals: 0, totalUsers: 0 }
      );

      setAggregates(totals);
      setUserDetails(users.sort((a, b) => b.sales - a.sales));
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
        shiftsWorked: number;
        points: number;
        income: number;
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
            shiftsWorked: item.shifts_worked || 0,
            points: Number(item.points) || 0,
            income: Number((item as any).income) || 0,
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
          shiftsWorked: data.shiftsWorked,
          points: data.points,
          income: data.income,
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
          totalShiftsWorked: acc.totalShiftsWorked + c.shiftsWorked,
        }),
        { totalCanvassers: 0, totalLeadsSet: 0, totalLeadsClosed: 0, totalLeadsWithDamage: 0, totalShiftsWorked: 0 }
      );

      setCanvasserAggregates(canvasserTotals);
      setCanvasserDetails(canvassers.sort((a, b) => b.leadsSet - a.leadsSet));
    }

    setLoading(false);
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
      <div>
        <h2 className="text-2xl font-heading text-foreground">Master Overview</h2>
        <p className="text-muted-foreground">Manage all team members and their performance</p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sales">Sales Reps ({aggregates.totalUsers})</TabsTrigger>
          <TabsTrigger value="canvassers">Canvassers ({canvasserAggregates.totalCanvassers})</TabsTrigger>
        </TabsList>

        {/* Sales Reps Tab */}
        <TabsContent value="sales" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard title="Total Users" value={aggregates.totalUsers} icon={UserCheck} />
            <StatsCard title="Total Sales" value={formatCurrency(aggregates.totalSales)} icon={DollarSign} />
            <StatsCard title="Total Points" value={aggregates.totalPoints.toLocaleString()} icon={Star} />
            <StatsCard title="Total Leads" value={aggregates.totalLeads} icon={Users} />
            <StatsCard title="Total Closed Deals" value={aggregates.totalClosedDeals} icon={Briefcase} />
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
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Sales</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Goal</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Points</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Leads</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Closed</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Avg Job</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Close %</th>
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
                          <td className="py-3 px-4 text-right text-foreground">{formatCurrency(user.sales)}</td>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard title="Total Canvassers" value={canvasserAggregates.totalCanvassers} icon={UserCheck} />
            <StatsCard title="Leads Set" value={canvasserAggregates.totalLeadsSet} icon={Target} />
            <StatsCard title="Leads Closed" value={canvasserAggregates.totalLeadsClosed} icon={CheckCircle} />
            <StatsCard title="With Damage" value={canvasserAggregates.totalLeadsWithDamage} icon={AlertTriangle} />
            <StatsCard title="Shifts Worked" value={canvasserAggregates.totalShiftsWorked} icon={Clock} />
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
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Shifts</th>
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
                          <td className="py-3 px-4 text-right text-foreground">{canvasser.shiftsWorked}</td>
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
          shiftsWorked: selectedCanvasser.shiftsWorked,
          points: selectedCanvasser.points,
          income: selectedCanvasser.income || 0,
        } : null}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}