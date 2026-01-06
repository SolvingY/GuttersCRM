import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdownTooltip } from './PointsBreakdownTooltip';

export interface WeeklyCanvasserEntry {
  rank: number;
  name: string;
  userId: string;
  leadsSet: number;
  leadsWithDamage: number;
  leadsClosed: number;
  shiftsWorked: number;
  doorsKnocked: number;
  pointsEarned: number;
}

interface WeeklyCanvasserLeaderboardTableProps {
  entries: WeeklyCanvasserEntry[];
  currentUserId?: string;
}

export function WeeklyCanvasserLeaderboardTable({ entries, currentUserId }: WeeklyCanvasserLeaderboardTableProps) {
  // Get row background color based on rank
  const getRowColor = (rank: number) => {
    if (rank === 1) return 'bg-emerald-500 text-white';
    if (rank === 2) return 'bg-green-400 text-green-950';
    if (rank === 3) return 'bg-yellow-300 text-yellow-950';
    if (rank <= 5) return 'bg-orange-400 text-orange-950';
    return 'bg-card text-card-foreground';
  };

  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No weekly canvasser data available yet.</p>
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
              <th className="text-left py-3 px-4 text-sm font-bold whitespace-nowrap">Canvasser</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Doors Knocked</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Leads Set</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Leads w/ Damage</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Leads Closed</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Shifts Worked</th>
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
                  <td className="py-3 px-4 text-right font-bold">{entry.doorsKnocked}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsSet}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsWithDamage}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsClosed}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.shiftsWorked}</td>
                  <td className="py-3 px-4 text-right">
                    <PointsBreakdownTooltip
                      data={{
                        type: 'canvasser',
                        leadsSet: entry.leadsSet,
                        leadsWithDamage: entry.leadsWithDamage,
                        leadsClosed: entry.leadsClosed,
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