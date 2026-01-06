import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdownTooltip } from './PointsBreakdownTooltip';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
  sales: number;
  closedDeals: number;
  yearlyGoal: number;
  salesRank: string;
  contestsWon: number;
  collections?: number;
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

  const calculatePercentage = (sales: number, goal: number) => {
    if (!goal || goal === 0) return 0;
    return (sales / goal) * 100;
  };

  // Get row background color based on percentage of goal
  const getRowColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500 text-white'; // Deep green for 100%+
    if (percentage >= 75) return 'bg-green-400 text-green-950'; // Light green for 75-99%
    if (percentage >= 50) return 'bg-yellow-300 text-yellow-950'; // Yellow for 50-74%
    if (percentage >= 25) return 'bg-orange-400 text-orange-950'; // Orange for 25-49%
    return 'bg-red-300 text-red-950'; // Red/Pink for below 25%
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
            {entries.map((entry, index) => {
              const percentage = calculatePercentage(entry.sales, entry.yearlyGoal);
              const amountUntilGoal = Math.max(0, entry.yearlyGoal - entry.sales);
              const rowColor = getRowColor(percentage);
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
                      {formatCurrency(entry.sales)}
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
                        sales: entry.sales,
                        closedDeals: entry.closedDeals || 0,
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
