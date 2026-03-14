import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Search, ArrowUpDown, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

type SortField = 'created_at' | 'quoted_price' | 'total_floor' | 'commission' | 'rep';
type SortDir = 'asc' | 'desc';

export default function AllEstimates() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [repFilter, setRepFilter] = useState('all');
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'standalone'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['admin-all-estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gutter_estimates')
        .select('*, profiles:created_by(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch linked lead info for estimates with lead_id
      const leadIds = (data || []).filter(e => e.lead_id).map(e => e.lead_id!);
      let leadsMap: Record<string, any> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('quote_requests')
          .select('id, full_name, reference_number, status, quote_status')
          .in('id', leadIds);
        if (leads) {
          leadsMap = Object.fromEntries(leads.map(l => [l.id, l]));
        }
      }

      return (data || []).map((e: any) => ({
        ...e,
        rep_name: e.profiles?.full_name || 'Unknown',
        lead: e.lead_id ? leadsMap[e.lead_id] || null : null,
      }));
    },
  });

  // Unique reps for filter
  const reps = useMemo(() => {
    const names = [...new Set(estimates.map((e: any) => e.rep_name))].filter(Boolean).sort();
    return names as string[];
  }, [estimates]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = [...estimates];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        (e.customer_name || '').toLowerCase().includes(q) ||
        (e.job_number || '').toLowerCase().includes(q) ||
        (e.rep_name || '').toLowerCase().includes(q)
      );
    }

    if (repFilter !== 'all') {
      result = result.filter((e: any) => e.rep_name === repFilter);
    }

    if (linkedFilter === 'linked') {
      result = result.filter((e: any) => e.lead_id);
    } else if (linkedFilter === 'standalone') {
      result = result.filter((e: any) => !e.lead_id);
    }

    if (dateFrom) {
      result = result.filter((e: any) => new Date(e.created_at) >= dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter((e: any) => new Date(e.created_at) <= end);
    }

    // Sort
    result.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      if (sortField === 'rep') {
        aVal = (a.rep_name || '').toLowerCase();
        bVal = (b.rep_name || '').toLowerCase();
      } else {
        aVal = a[sortField] ?? 0;
        bVal = b[sortField] ?? 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [estimates, search, repFilter, linkedFilter, dateFrom, dateTo, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortField === field && 'text-foreground')} />
    </button>
  );

  const clearFilters = () => {
    setSearch('');
    setRepFilter('all');
    setLinkedFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = search || repFilter !== 'all' || linkedFilter !== 'all' || dateFrom || dateTo;

  const fmt = (v: number | null) => v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-foreground">All Estimates</h2>
        <Badge variant="secondary">{filtered.length} estimate{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer, job #, or rep..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {reps.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={linkedFilter} onValueChange={(v: any) => setLinkedFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="linked">Linked to Lead</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('text-xs', dateFrom && 'text-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {dateFrom ? format(dateFrom, 'MM/dd/yy') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('text-xs', dateTo && 'text-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {dateTo ? format(dateTo, 'MM/dd/yy') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table / Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading estimates...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No estimates found.</div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{e.customer_name || 'No Customer'}</p>
                    <p className="text-xs text-muted-foreground">{e.job_number || '—'}</p>
                  </div>
                  <Badge variant={e.lead_id ? 'default' : 'outline'} className="text-[10px]">
                    {e.lead_id ? 'Linked' : 'Standalone'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Rep:</span> {e.rep_name}</div>
                  <div><span className="text-muted-foreground">Date:</span> {e.created_at ? format(new Date(e.created_at), 'MM/dd/yy') : '—'}</div>
                  <div><span className="text-muted-foreground">Quoted:</span> {fmt(e.quoted_price)}</div>
                  <div><span className="text-muted-foreground">Floor:</span> {fmt(e.total_floor)}</div>
                  <div><span className="text-muted-foreground">Commission:</span> {fmt(e.commission)}</div>
                  {e.lead && <div><span className="text-muted-foreground">Lead:</span> {e.lead.reference_number}</div>}
                </div>
                <div className="flex gap-2 pt-1">
                  {e.lead_id && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate(`/admin/leads/${e.lead_id}`)}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Lead
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader field="created_at" label="Date" /></TableHead>
                <TableHead><SortHeader field="rep" label="Rep" /></TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Job #</TableHead>
                <TableHead><SortHeader field="quoted_price" label="Quoted" /></TableHead>
                <TableHead><SortHeader field="total_floor" label="Floor" /></TableHead>
                <TableHead><SortHeader field="commission" label="Commission" /></TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.created_at ? format(new Date(e.created_at), 'MM/dd/yy') : '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{e.rep_name}</TableCell>
                  <TableCell className="text-sm">{e.customer_name || '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{e.job_number || '—'}</TableCell>
                  <TableCell className="text-sm">{fmt(e.quoted_price)}</TableCell>
                  <TableCell className="text-sm">{fmt(e.total_floor)}</TableCell>
                  <TableCell className="text-sm">{fmt(e.commission)}</TableCell>
                  <TableCell>
                    {e.lead ? (
                      <Badge variant="default" className="text-[10px]">{e.lead.reference_number}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Standalone</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.lead_id && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/admin/leads/${e.lead_id}`)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> View Lead
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
