import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  userId: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No leaderboard data available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rank</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.userId}
              className={cn(
                'border-t border-border transition-colors',
                entry.userId === currentUserId && 'bg-accent/5'
              )}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {entry.rank <= 3 ? (
                    <Trophy
                      className={cn(
                        'h-4 w-4',
                        entry.rank === 1 && 'text-yellow-500',
                        entry.rank === 2 && 'text-gray-400',
                        entry.rank === 3 && 'text-amber-600'
                      )}
                    />
                  ) : (
                    <span className="w-4 text-center text-muted-foreground">{entry.rank}</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={cn('text-foreground', entry.userId === currentUserId && 'font-medium')}>
                  {entry.name}
                  {entry.userId === currentUserId && (
                    <span className="ml-2 text-xs text-accent">(You)</span>
                  )}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-medium text-foreground">{entry.points.toLocaleString()}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
