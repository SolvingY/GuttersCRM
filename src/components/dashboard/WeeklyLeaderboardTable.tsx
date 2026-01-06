import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdownTooltip } from './PointsBreakdownTooltip';

interface WeeklyLeaderboardEntry {
  rank: number;
  name: string;
  userId: string;
  approvedRevenue: number;
  collections: number;
  leads: number;
  closedDeals: number;
  pointsEarned: number;
}

interface WeeklyLeaderboardTableProps {
  entries: WeeklyLeaderboardEntry[];
  currentUserId?: string;
}

export function WeeklyLeaderboardTable({ entries, currentUserId }: WeeklyLeaderboardTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get row background color based on rank
  const getRowColor = (rank: number) => {
    if (rank === 1) return 'bg-emerald-500 text-white';
    if (rank === 2) return 'bg-green-400 text-green-950';
    if (rank === 3) return 'bg-yellow-300 text-yellow-950';
    if (rank <= 5) return 'bg-orange-300 text-orange-950';
    return 'bg-card text-card-foreground';
  };

  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No weekly data available yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Weekly metrics will appear once data is recorded for this week.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-bold whitespace-nowrap">Place</th>
              <th className="text-left py-3 px-4 text-sm font-bold whitespace-nowrap">NGR Sales Rep</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Approved Revenue</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Collections</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Leads</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Closed Deals</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Points Earned</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const rowColor = getRowColor(entry.rank);
              const isCurrentUser = entry.userId === currentUserId;
              
              return (
                <tr
                  key={entry.userId}
                  className={cn(
                    'border-t border-slate-200/20 transition-all',
                    rowColor,
                    isCurrentUser && 'ring-2 ring-inset ring-slate-900 font-bold'
                  )}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {entry.rank <= 3 ? (
                        <Trophy
                          className={cn(
                            'h-5 w-5',
                            entry.rank === 1 && 'text-yellow-400 drop-shadow-lg',
                            entry.rank === 2 && 'text-slate-300 drop-shadow-lg',
                            entry.rank === 3 && 'text-amber-600 drop-shadow-lg'
                          )}
                          fill={entry.rank === 1 ? '#facc15' : entry.rank === 2 ? '#cbd5e1' : '#d97706'}
                        />
                      ) : (
                        <span className="w-5 text-center font-bold">{entry.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold">
                      {entry.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">(You)</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold">
                      {formatCurrency(entry.approvedRevenue)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold">
                      {formatCurrency(entry.collections)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium">
                      {entry.leads}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium">
                      {entry.closedDeals}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <PointsBreakdownTooltip
                      data={{
                        type: 'salesRep',
                        sales: entry.approvedRevenue,
                        closedDeals: entry.closedDeals,
                        totalPoints: entry.pointsEarned,
                      }}
                    >
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary">
                        {entry.pointsEarned.toLocaleString()}
                      </span>
                    </PointsBreakdownTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}