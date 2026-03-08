import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DollarSign, TrendingUp, Target, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesPerformance() {
  // Aggregate deal metrics from quote_requests
  const { data: metrics } = useQuery({
    queryKey: ['sales-performance-metrics'],
    queryFn: async () => {
      const { data: wonDeals, error } = await supabase
        .from('quote_requests')
        .select('id, quote_amount, assigned_to, status, created_at')
        .eq('status', 'won');
      if (error) throw error;

      const { count: totalLeads } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true });

      const totalRevenue = (wonDeals || []).reduce((sum, d) => sum + (Number(d.quote_amount) || 0), 0);
      const dealsWon = wonDeals?.length || 0;
      const closeRate = totalLeads && totalLeads > 0 ? ((dealsWon / totalLeads) * 100).toFixed(1) : '0';
      const avgDealSize = dealsWon > 0 ? Math.round(totalRevenue / dealsWon) : 0;

      return { totalRevenue, dealsWon, closeRate, avgDealSize, wonDeals: wonDeals || [], totalLeads: totalLeads || 0 };
    },
  });

  // Per-rep breakdown
  const { data: repBreakdown = [] } = useQuery({
    queryKey: ['sales-performance-reps'],
    queryFn: async () => {
      const { data: wonDeals } = await supabase
        .from('quote_requests')
        .select('assigned_to, quote_amount')
        .eq('status', 'won')
        .not('assigned_to', 'is', null);

      const { data: allLeads } = await supabase
        .from('quote_requests')
        .select('assigned_to')
        .not('assigned_to', 'is', null);

      if (!wonDeals || !allLeads) return [];

      // Group by rep
      const repMap = new Map<string, { won: number; revenue: number; total: number }>();
      for (const lead of allLeads) {
        const rid = lead.assigned_to!;
        if (!repMap.has(rid)) repMap.set(rid, { won: 0, revenue: 0, total: 0 });
        repMap.get(rid)!.total++;
      }
      for (const deal of wonDeals) {
        const rid = deal.assigned_to!;
        if (!repMap.has(rid)) repMap.set(rid, { won: 0, revenue: 0, total: 0 });
        const entry = repMap.get(rid)!;
        entry.won++;
        entry.revenue += Number(deal.contract_value) || 0;
      }

      // Get display names
      const repIds = Array.from(repMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', repIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.display_name || 'Unknown']));

      return Array.from(repMap.entries())
        .map(([id, stats]) => ({
          name: nameMap.get(id) || 'Unknown',
          dealsWon: stats.won,
          revenue: stats.revenue,
          closeRate: stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0',
        }))
        .sort((a, b) => b.revenue - a.revenue);
    },
  });

  // Monthly revenue trend
  const { data: trendData = [] } = useQuery({
    queryKey: ['sales-performance-trend'],
    queryFn: async () => {
      const { data: wonDeals } = await supabase
        .from('quote_requests')
        .select('contract_value, created_at')
        .eq('status', 'won')
        .order('created_at', { ascending: true });

      if (!wonDeals?.length) return [];

      const monthMap = new Map<string, number>();
      for (const deal of wonDeals) {
        const month = deal.created_at.slice(0, 7); // YYYY-MM
        monthMap.set(month, (monthMap.get(month) || 0) + (Number(deal.contract_value) || 0));
      }

      return Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, revenue]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          revenue,
        }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl uppercase">Sales Performance</h1>
        <p className="text-sm text-muted-foreground">Revenue metrics, close rates, and rep breakdown</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Total Revenue" value={`$${(metrics?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} />
        <StatsCard title="Deals Won" value={metrics?.dealsWon || 0} icon={TrendingUp} />
        <StatsCard title="Close Rate" value={`${metrics?.closeRate || 0}%`} icon={Target} />
        <StatsCard title="Avg Deal Size" value={`$${(metrics?.avgDealSize || 0).toLocaleString()}`} icon={Users} />
      </div>

      {/* Revenue Trend Chart */}
      {trendData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading font-semibold text-foreground mb-4">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-muted-foreground" tick={{ fontSize: 12 }} />
              <YAxis className="text-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-rep breakdown */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-heading font-semibold text-foreground mb-4">Rep Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Rep</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Deals Won</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Revenue</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Close Rate</th>
              </tr>
            </thead>
            <tbody>
              {repBreakdown.map((rep) => (
                <tr key={rep.name} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium text-foreground">{rep.name}</td>
                  <td className="py-2 px-3 text-right text-foreground">{rep.dealsWon}</td>
                  <td className="py-2 px-3 text-right text-foreground">${rep.revenue.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-foreground">{rep.closeRate}%</td>
                </tr>
              ))}
              {repBreakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">No won deals yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
