import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
  sales: number;
  yearlyGoal: number;
  salesRank: string;
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

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 bg-green-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 25) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No leaderboard data available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Place</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">NGR Sales Rep</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Rank</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Indiv. Rep Goals</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">YTD Approved Rev</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">Amount Until Goal</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">% of Goal</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const percentage = calculatePercentage(entry.sales, entry.yearlyGoal);
              const amountUntilGoal = Math.max(0, entry.yearlyGoal - entry.sales);
              
              return (
                <tr
                  key={entry.userId}
                  className={cn(
                    'border-t border-border transition-colors',
                    entry.userId === currentUserId && 'bg-accent/10'
                  )}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {entry.rank <= 3 ? (
                        <Trophy
                          className={cn(
                            'h-5 w-5',
                            entry.rank === 1 && 'text-yellow-500',
                            entry.rank === 2 && 'text-gray-400',
                            entry.rank === 3 && 'text-amber-600'
                          )}
                        />
                      ) : (
                        <span className="w-5 text-center text-muted-foreground font-medium">{entry.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn('text-foreground', entry.userId === currentUserId && 'font-semibold')}>
                      {entry.name}
                      {entry.userId === currentUserId && (
                        <span className="ml-2 text-xs text-accent font-medium">(You)</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {entry.salesRank || 'SR1'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-foreground">
                      {formatCurrencyShort(entry.yearlyGoal)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-foreground">
                      {formatCurrency(entry.sales)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-muted-foreground">
                      {formatCurrency(amountUntilGoal)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getPercentageColor(percentage)
                    )}>
                      {percentage.toFixed(2)}%
                    </span>
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
