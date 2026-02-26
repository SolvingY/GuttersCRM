import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { FISCAL_YEAR } from '@/lib/constants';
import { format } from 'date-fns';

interface MonthlyData {
  month: string;
  revenue: number;
  jobs: number;
}

interface MethodData {
  name: string;
  value: number;
  color: string;
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  Cash: '#66bb6a',
  Check: '#42a5f5',
  Card: '#ab47bc',
  Financing: '#ffa726',
  Zelle: '#5c6bc0',
  Venmo: '#26a69a',
  Other: '#9e9e9e',
};

const normalizeMethod = (method: string | null): string => {
  if (!method) return 'Other';
  const lower = method.toLowerCase().trim();
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('check')) return 'Check';
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return 'Card';
  if (lower.includes('financ')) return 'Financing';
  if (lower.includes('zelle')) return 'Zelle';
  if (lower.includes('venmo')) return 'Venmo';
  // Capitalize first letter
  return method.charAt(0).toUpperCase() + method.slice(1);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export function RevenueAnalyticsWidget() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [methodData, setMethodData] = useState<MethodData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      const fiscalStart = FISCAL_YEAR.CURRENT_YEAR_START.toISOString().split('T')[0];

      const { data: payments, error } = await supabase
        .from('lead_payments')
        .select('amount, payment_method, payment_date')
        .gte('payment_date', fiscalStart);

      if (error) {
        console.error('Error fetching revenue data:', error);
        setLoading(false);
        return;
      }

      const items = payments || [];

      // Monthly grouping
      const monthMap = new Map<string, { revenue: number; jobs: number }>();
      const methodMap = new Map<string, number>();

      items.forEach(p => {
        if (!p.payment_date) return;

        const d = new Date(p.payment_date + 'T00:00:00');
        const monthKey = format(d, 'MMM yyyy');
        const existing = monthMap.get(monthKey) || { revenue: 0, jobs: 0 };
        existing.revenue += Number(p.amount) || 0;
        existing.jobs += 1;
        monthMap.set(monthKey, existing);

        const method = normalizeMethod(p.payment_method);
        methodMap.set(method, (methodMap.get(method) || 0) + (Number(p.amount) || 0));
      });

      // Sort monthly data chronologically
      const monthly = Array.from(monthMap.entries())
        .map(([month, data]) => ({ month, revenue: data.revenue, jobs: data.jobs }))
        .sort((a, b) => new Date('1 ' + a.month).getTime() - new Date('1 ' + b.month).getTime());

      setMonthlyData(monthly);

      // Payment methods
      const methods = Array.from(methodMap.entries())
        .map(([name, value]) => ({
          name,
          value,
          color: PAYMENT_METHOD_COLORS[name] || PAYMENT_METHOD_COLORS.Other,
        }))
        .sort((a, b) => b.value - a.value);

      setMethodData(methods);
      setLoading(false);
    };

    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalJobs = monthlyData.reduce((sum, m) => sum + m.jobs, 0);
  const avgJobSize = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-6">
      <div>
        <h3 className="font-heading font-semibold text-foreground">Revenue Collected (Fiscal Year)</h3>
        <p className="text-sm text-muted-foreground">Payment data from the current fiscal year</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">Total Collected</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{totalJobs}</p>
          <p className="text-xs text-muted-foreground">Payments</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(avgJobSize)}</p>
          <p className="text-xs text-muted-foreground">Avg Payment</p>
        </div>
      </div>

      {monthlyData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No payment data for this fiscal year.</p>
      ) : (
        <>
          {/* Bar chart */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Monthly Revenue</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.375rem',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(348, 83%, 47%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart + table side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie chart */}
            {methodData.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Payment Methods</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {methodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.375rem',
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                      <Legend
                        formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Monthly table */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Monthly Breakdown</h4>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Month</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Payments</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Revenue</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(m => (
                      <tr key={m.month} className="border-b border-border/50">
                        <td className="py-1.5 px-2 text-foreground">{m.month}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{m.jobs}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-foreground">{formatCurrency(m.revenue)}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">
                          {m.jobs > 0 ? formatCurrency(m.revenue / m.jobs) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
