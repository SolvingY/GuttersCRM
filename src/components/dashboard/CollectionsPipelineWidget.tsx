import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, ArrowUpDown, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface CollectionLead {
  id: string;
  full_name: string;
  street_address: string;
  city: string;
  quote_amount: number;
  assigned_to: string | null;
  install_date: string | null;
  status: string;
  totalPaid: number;
  balanceDue: number;
  repName: string;
}

interface CollectionsPipelineWidgetProps {
  isAdmin: boolean;
}

export function CollectionsPipelineWidget({ isAdmin }: CollectionsPipelineWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<CollectionLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [repFilter, setRepFilter] = useState<string>('all');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCollections();
  }, [user]);

  const fetchCollections = async () => {
    let query = supabase
      .from('quote_requests')
      .select(`
        id, full_name, street_address, city, quote_amount, assigned_to,
        install_date, status,
        lead_payments(amount)
      `)
      .in('status', ['won', 'scheduled'])
      .not('quote_amount', 'is', null);

    if (!isAdmin) {
      query = query.eq('assigned_to', user!.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching collections:', error);
      setLoading(false);
      return;
    }

    // Get profile names for assigned reps
    const assignedIds = [...new Set((data || []).map(d => d.assigned_to).filter(Boolean))] as string[];
    let profilesMap = new Map<string, string>();

    if (assignedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assignedIds);

      profiles?.forEach(p => {
        if (p.full_name) profilesMap.set(p.id, p.full_name);
      });
    }

    const withBalances: CollectionLead[] = (data || [])
      .map(lead => {
        const totalPaid = (lead.lead_payments as any[])?.reduce(
          (sum: number, p: any) => sum + (Number(p.amount) || 0), 0
        ) ?? 0;
        const balanceDue = (Number(lead.quote_amount) || 0) - totalPaid;

        return {
          id: lead.id,
          full_name: lead.full_name,
          street_address: lead.street_address,
          city: lead.city,
          quote_amount: Number(lead.quote_amount) || 0,
          assigned_to: lead.assigned_to,
          install_date: lead.install_date,
          status: lead.status,
          totalPaid,
          balanceDue,
          repName: lead.assigned_to ? (profilesMap.get(lead.assigned_to) || 'Unassigned') : 'Unassigned',
        };
      })
      .filter(lead => lead.balanceDue > 0);

    setLeads(withBalances);
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const handleView = (leadId: string) => {
    if (isAdmin) {
      navigate(`/admin/leads/${leadId}`);
    } else {
      navigate(`/dashboard/leads/${leadId}`);
    }
  };

  if (loading) return null;

  // Get unique reps for filter
  const reps = [...new Set(leads.map(l => l.repName))].sort();

  const filteredLeads = repFilter === 'all'
    ? leads
    : leads.filter(l => l.repName === repFilter);

  const sortedLeads = [...filteredLeads].sort((a, b) =>
    sortAsc ? a.balanceDue - b.balanceDue : b.balanceDue - a.balanceDue
  );

  const totalOutstanding = filteredLeads.reduce((sum, l) => sum + l.balanceDue, 0);

  // Simplified card for rep dashboard
  if (!isAdmin) {
    if (leads.length === 0) return null;

    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-accent">
            <Wallet className="h-4 w-4" />
            Collections Due
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-2xl font-heading text-foreground">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground">
            outstanding across {leads.length} job{leads.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-2 space-y-1.5">
            {sortedLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between text-xs p-1.5 bg-card rounded border border-border">
                <span className="truncate flex-1 text-foreground">{lead.full_name}</span>
                <span className="font-medium text-destructive ml-2">{formatCurrency(lead.balanceDue)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 ml-1"
                  onClick={() => handleView(lead.id)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {leads.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{leads.length - 5} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full admin table
  if (leads.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            Outstanding Collections
            <Badge variant="outline" className="ml-1">{formatCurrency(totalOutstanding)}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="All Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {reps.map(rep => (
                  <SelectItem key={rep} value={rep}>{rep}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setSortAsc(!sortAsc)}
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-2">Rep</th>
                <th className="text-left py-2 pr-2">Customer</th>
                <th className="text-right py-2 pr-2">Job Amount</th>
                <th className="text-right py-2 pr-2">Paid</th>
                <th className="text-right py-2 pr-2">Balance</th>
                <th className="text-left py-2 pr-2">Install Date</th>
                <th className="text-left py-2">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map(lead => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 pr-2 text-foreground">{lead.repName}</td>
                  <td className="py-2 pr-2 text-foreground">{lead.full_name}</td>
                  <td className="py-2 pr-2 text-right text-foreground">{formatCurrency(lead.quote_amount)}</td>
                  <td className="py-2 pr-2 text-right text-green-600">{formatCurrency(lead.totalPaid)}</td>
                  <td className="py-2 pr-2 text-right font-medium text-destructive">{formatCurrency(lead.balanceDue)}</td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {lead.install_date ? new Date(lead.install_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{lead.status}</Badge>
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleView(lead.id)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-medium">
                <td colSpan={4} className="py-2 text-right text-muted-foreground">TOTAL:</td>
                <td className="py-2 text-right text-destructive font-bold">{formatCurrency(totalOutstanding)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
