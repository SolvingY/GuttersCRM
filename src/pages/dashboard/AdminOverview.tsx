import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { EditMetricsModal } from '@/components/dashboard/EditMetricsModal';
import { UserStatsModal } from '@/components/dashboard/UserStatsModal';
import { DollarSign, Star, Users, Briefcase, UserCheck, Loader2, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AggregateMetrics {
  totalSales: number;
  totalPoints: number;
  totalLeads: number;
  totalClosedDeals: number;
  totalUsers: number;
}

interface UserDetail {
  userId: string;
  name: string;
  sales: number;
  points: number;
  leads: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  earningsYtd: number;
}

export default function AdminOverview() {
  const [aggregates, setAggregates] = useState<AggregateMetrics>({
    totalSales: 0,
    totalPoints: 0,
    totalLeads: 0,
    totalClosedDeals: 0,
    totalUsers: 0,
  });
  const [userDetails, setUserDetails] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  const fetchAdminData = async () => {
    // Fetch all metrics including display_name for test users
    const { data: metrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('id, user_id, display_name, sales, points, leads, closed_deals, yearly_goal, sales_rank, earnings_ytd, metric_date')
      .order('metric_date', { ascending: false });

    if (metricsError) {
      console.error('Error fetching admin metrics:', metricsError);
      setLoading(false);
      return;
    }

    if (!metrics || metrics.length === 0) {
      setLoading(false);
      return;
    }

    // Get latest metric per user (use metric id for test users without user_id)
    const latestByUser = new Map<string, Omit<UserDetail, 'name'> & { displayName: string | null; metricId: string }>();
    
    for (const item of metrics) {
      // Use user_id if available, otherwise use metric id as key
      const key = item.user_id || `metric_${item.id}`;
      if (!latestByUser.has(key)) {
        latestByUser.set(key, {
          userId: key,
          metricId: item.id,
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

    // Fetch profiles only for real user_ids (not null)
    const realUserIds = Array.from(latestByUser.keys()).filter(id => !id.startsWith('metric_'));
    const { data: profilesData } = realUserIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', realUserIds)
      : { data: [] };

    const profilesMap = new Map<string, string | null>(
      profilesData?.map((p) => [p.id, p.full_name] as [string, string | null]) || []
    );

    const users: UserDetail[] = Array.from(latestByUser.entries()).map(([userId, data]) => ({
      userId: data.metricId, // Use metricId for editing
      sales: data.sales,
      points: data.points,
      leads: data.leads,
      closedDeals: data.closedDeals,
      yearlyGoal: data.yearlyGoal,
      salesRank: data.salesRank,
      earningsYtd: data.earningsYtd,
      name: data.displayName || profilesMap.get(userId) || 'Unknown User',
    }));
    
    // Calculate aggregates
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

  const handleEditSuccess = () => {
    setLoading(true);
    fetchAdminData();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading text-foreground">Master Overview</h2>
        <p className="text-muted-foreground">Aggregate performance across all users</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Users"
          value={aggregates.totalUsers}
          icon={UserCheck}
        />
        <StatsCard
          title="Total Sales"
          value={formatCurrency(aggregates.totalSales)}
          icon={DollarSign}
        />
        <StatsCard
          title="Total Points"
          value={aggregates.totalPoints.toLocaleString()}
          icon={Star}
        />
        <StatsCard
          title="Total Leads"
          value={aggregates.totalLeads}
          icon={Users}
        />
        <StatsCard
          title="Total Closed Deals"
          value={aggregates.totalClosedDeals}
          icon={Briefcase}
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-heading text-foreground">All Users Performance</h3>
        </div>
        {userDetails.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No user data available yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Rank</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Sales</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Goal</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Points</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Leads</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Closed Deals</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userDetails.map((user) => (
                  <tr key={user.userId} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-foreground font-medium">{user.name}</td>
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
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewUser(user)}
                          title="View stats"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          title="Edit metrics"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}
