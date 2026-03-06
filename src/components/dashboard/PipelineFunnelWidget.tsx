import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { leadSourceConfig } from '@/lib/leadSourceConfig';

interface FunnelStage {
  stage: string;
  count: number;
  rate: string;
}

const STAGE_COLORS = [
  'hsl(348, 83%, 47%)',
  'hsl(348, 83%, 55%)',
  'hsl(348, 70%, 60%)',
  'hsl(200, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(120, 50%, 45%)',
  'hsl(0, 0%, 55%)',
];

const getDateRange = (range: string): string | null => {
  const now = new Date();
  switch (range) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1).toISOString();
    case 'all':
    default:
      return null;
  }
};

export function PipelineFunnelWidget() {
  const [dateRange, setDateRange] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnel = async () => {
      setLoading(true);
      const dateFrom = getDateRange(dateRange);

      let query = supabase
        .from('quote_requests')
        .select('status, contacted_at, quoted_at, won_at, lead_source')
        .not('status', 'eq', 'archived');

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (sourceFilter !== 'all') {
        query = query.eq('lead_source', sourceFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching funnel data:', error);
        setLoading(false);
        return;
      }

      const leads = data || [];
      const total = leads.length;

      // Use cumulative logic: if a lead reached a later stage, count it in all prior stages
      const wonStatuses = ['won', 'scheduled', 'completed'];
      const scheduledStatuses = ['scheduled', 'completed'];

      const isWon = (l: any) => wonStatuses.includes(l.status);
      const isScheduled = (l: any) => scheduledStatuses.includes(l.status);
      const isCompleted = (l: any) => l.status === 'completed';
      const isLost = (l: any) => l.status === 'lost';

      // Cumulative: contacted includes anyone who was contacted OR progressed further
      const contacted = leads.filter(l => l.contacted_at || l.quoted_at || isWon(l)).length;
      // Quoted includes anyone who was quoted OR progressed further
      const quoted = leads.filter(l => l.quoted_at || isWon(l)).length;
      const won = leads.filter(l => isWon(l)).length;
      const scheduled = leads.filter(l => isScheduled(l)).length;
      const completed = leads.filter(l => isCompleted(l)).length;
      const lost = leads.filter(l => isLost(l)).length;

      const calcRate = (current: number, previous: number) =>
        previous > 0 ? `${((current / previous) * 100).toFixed(1)}%` : 'N/A';

      const stages: FunnelStage[] = [
        { stage: 'Total Leads', count: total, rate: '100%' },
        { stage: 'Contacted', count: contacted, rate: calcRate(contacted, total) },
        { stage: 'Quoted', count: quoted, rate: calcRate(quoted, contacted) },
        { stage: 'Won', count: won, rate: calcRate(won, quoted) },
        { stage: 'Scheduled', count: scheduled, rate: calcRate(scheduled, won) },
        { stage: 'Completed', count: completed, rate: calcRate(completed, scheduled) },
      ];

      if (lost > 0) {
        stages.push({ stage: 'Lost', count: lost, rate: calcRate(lost, total) });
      }

      setFunnelData(stages);
      setLoading(false);
    };

    fetchFunnel();
  }, [dateRange, sourceFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Conversion rates between pipeline stages</p>
        <div className="flex items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(leadSourceConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {funnelData[0]?.count === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No leads found for this period.</p>
      ) : (
        <div className="space-y-1">
          {funnelData.map((stage, i) => {
            const maxCount = funnelData[0].count;
            const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
            return (
              <div key={stage.stage}>
                {i > 0 && (
                  <div className="text-center text-xs text-muted-foreground py-0.5">
                    ↓ {stage.rate}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{stage.stage}</span>
                  <div className="flex-1 relative">
                    <div
                      className="h-8 rounded flex items-center justify-end pr-2 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: STAGE_COLORS[i],
                        minWidth: '2.5rem',
                      }}
                    >
                      <span className="text-xs font-semibold text-white">{stage.count}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
