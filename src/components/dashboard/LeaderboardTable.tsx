import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdownTooltip } from './PointsBreakdownTooltip';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
  approvedRevenue: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  contestsWon: number;
  collections?: number;
  contestPoints?: number;
  wagerPoints?: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const calculatePercentage = (revenue: number, goal: number) => {
    if (!goal || goal === 0) return 0;
    return (revenue / goal) * 100;
  };

  // Get row background color based on rank (consistent with weekly tables)
  const getRowColor = (rank: number) => {
    if (rank === 1) return 'bg-emerald-500 text-white';
    if (rank === 2) return 'bg-green-400 text-green-950';
    if (rank === 3) return 'bg-yellow-300 text-yellow-950';
    if (rank <= 5) return 'bg-orange-300 text-orange-950';
    return 'bg-card text-card-foreground';
  };

  // Get percentage badge color (matches row but slightly different for contrast)
  const getPercentageBadgeColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-700 text-white';
    if (percentage >= 75) return 'bg-green-600 text-white';
    if (percentage >= 50) return 'bg-yellow-600 text-white';
    if (percentage >= 25) return 'bg-orange-600 text-white';
    return 'bg-red-600 text-white';
  };

  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No leaderboard data available yet.</p>
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
              <th className="text-left py-3 px-4 text-sm font-bold whitespace-nowrap">Rank</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Indiv. Rep Goals</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">YTD Approved Rev</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Collections</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Amount Until Goal</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">% of Goal</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Points</th>
              <th className="text-center py-3 px-4 text-sm font-bold whitespace-nowrap">Contests Won</th>
            </tr>
          </thead>
          <tbody>
          {entries.map((entry) => {
              const percentage = calculatePercentage(entry.approvedRevenue, entry.yearlyGoal);
              const amountUntilGoal = Math.max(0, entry.yearlyGoal - entry.approvedRevenue);
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
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900/20 backdrop-blur-sm">
                      {entry.salesRank || 'SR1'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold">
                      {formatCurrencyShort(entry.yearlyGoal)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold">
                      {formatCurrency(entry.approvedRevenue)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium">
                      {formatCurrency(entry.collections || 0)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium">
                      {formatCurrency(amountUntilGoal)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold',
                      getPercentageBadgeColor(percentage)
                    )}>
                      {percentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <PointsBreakdownTooltip
                      data={{
                        type: 'salesRep',
                        sales: entry.approvedRevenue,
                        closedDeals: entry.closedDeals || 0,
                        collections: entry.collections || 0,
                        contestPoints: entry.contestPoints || 0,
                        wagerPoints: entry.wagerPoints || 0,
                        totalPoints: entry.points,
                      }}
                    >
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary">
                        {entry.points.toLocaleString()}
                      </span>
                    </PointsBreakdownTooltip>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {entry.contestsWon > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                        🏆 {entry.contestsWon}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
