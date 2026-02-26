import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock } from 'lucide-react';
import { getLeadSourceLabel } from '@/lib/leadSourceConfig';

interface TimingData {
  label: string;
  avgDays: string | null;
}

interface SourceBreakdown {
  source: string;
  avgDaysToClose: string | null;
  count: number;
}

const avgDays = (leads: any[], fromField: string, toField: string): string | null => {
  const valid = leads.filter(l => l[fromField] && l[toField]);
  if (valid.length === 0) return null;
  const totalMs = valid.reduce(
    (sum: number, l: any) =>
      sum + (new Date(l[toField]).getTime() - new Date(l[fromField]).getTime()),
    0
  );
  return (totalMs / valid.length / 86400000).toFixed(1);
};

export function TimeToCloseWidget() {
  const [timings, setTimings] = useState<TimingData[]>([]);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('created_at, contacted_at, quoted_at, won_at, completed_at, lead_source')
        .not('won_at', 'is', null);

      if (error) {
        console.error('Error fetching time-to-close data:', error);
        setLoading(false);
        return;
      }

      const leads = data || [];

      const toContact = avgDays(leads, 'created_at', 'contacted_at');
      const toQuote = avgDays(leads, 'contacted_at', 'quoted_at');
      const toWon = avgDays(leads, 'quoted_at', 'won_at');
      const toComplete = avgDays(leads, 'won_at', 'completed_at');
      const totalAvg = avgDays(leads, 'created_at', 'completed_at');

      setTimings([
        { label: 'Lead Created → First Contact', avgDays: toContact },
        { label: 'First Contact → Quote', avgDays: toQuote },
        { label: 'Quote → Won', avgDays: toWon },
        { label: 'Won → Completed', avgDays: toComplete },
        { label: 'Total Lead to Complete', avgDays: totalAvg },
      ]);

      // Source breakdown
      const sourceGroups = new Map<string, any[]>();
      leads.forEach(l => {
        const src = l.lead_source || 'other';
        if (!sourceGroups.has(src)) sourceGroups.set(src, []);
        sourceGroups.get(src)!.push(l);
      });

      const breakdown: SourceBreakdown[] = Array.from(sourceGroups.entries())
        .map(([source, items]) => ({
          source,
          avgDaysToClose: avgDays(items, 'created_at', 'won_at'),
          count: items.length,
        }))
        .filter(b => b.count >= 1)
        .sort((a, b) => {
          const aVal = a.avgDaysToClose ? parseFloat(a.avgDaysToClose) : Infinity;
          const bVal = b.avgDaysToClose ? parseFloat(b.avgDaysToClose) : Infinity;
          return aVal - bVal;
        });

      setSourceBreakdown(breakdown);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Average time between pipeline stages (won deals only)</p>

      <div className="space-y-2">
        {timings.map((t, i) => {
          const isTotal = i === timings.length - 1;
          return (
            <div
              key={t.label}
              className={`flex items-center justify-between py-2 px-3 rounded ${
                isTotal ? 'bg-accent/10 border border-accent/20' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`h-3.5 w-3.5 ${isTotal ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className={`text-sm ${isTotal ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                  {t.label}
                </span>
              </div>
              <span className={`text-sm font-mono ${isTotal ? 'font-bold text-accent' : 'font-medium text-foreground'}`}>
                {t.avgDays !== null ? `${t.avgDays} days` : 'N/A'}
              </span>
            </div>
          );
        })}
      </div>

      {sourceBreakdown.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">By Lead Source (Lead → Won)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Source</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Days</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Deals</th>
                </tr>
              </thead>
              <tbody>
                {sourceBreakdown.map(b => (
                  <tr key={b.source} className="border-b border-border/50">
                    <td className="py-2 px-2 text-foreground">{getLeadSourceLabel(b.source)}</td>
                    <td className="py-2 px-2 text-right font-mono text-foreground">
                      {b.avgDaysToClose !== null ? `${b.avgDaysToClose}d` : 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
