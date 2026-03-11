import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PointsBreakdownTooltip } from './PointsBreakdownTooltip';

export interface WeeklyCanvasserEntry {
  rank: number;
  name: string;
  userId: string;
  canvasserRank?: string;
  leadsSet: number;
  leadsWithDamage: number;
  leadsWithoutDamage: number;
  leadsClosed: number;
  conversationsHad: number;
  notInterested: number;
  cancelledLeads?: number;
  contracts?: number;
  hoursWorked: number;
  doorsKnocked: number;
  pointsEarned: number;
  contestPoints?: number;
  wagerPoints?: number;
}

interface WeeklyCanvasserLeaderboardTableProps {
  entries: WeeklyCanvasserEntry[];
  currentUserId?: string;
  showHours?: boolean;
}

export function WeeklyCanvasserLeaderboardTable({ entries, currentUserId, showHours = false }: WeeklyCanvasserLeaderboardTableProps) {
  const getRowColor = (rank: number) => {
    if (rank === 1) return 'bg-emerald-500 text-white';
    if (rank === 2) return 'bg-green-400 text-green-950';
    if (rank === 3) return 'bg-yellow-300 text-yellow-950';
    if (rank <= 5) return 'bg-orange-400 text-orange-950';
    return 'bg-card text-card-foreground';
  };

  const totals = useMemo(() => {
    const totalLeadsSet = entries.reduce((sum, e) => sum + e.leadsSet, 0);
    const totalClosed = entries.reduce((sum, e) => sum + e.leadsClosed, 0);
    const totalDoors = entries.reduce((sum, e) => sum + e.doorsKnocked, 0);
    const totalConvos = entries.reduce((sum, e) => sum + e.conversationsHad, 0);
    const totalNotInterested = entries.reduce((sum, e) => sum + e.notInterested, 0);
    const totalCancelled = entries.reduce((sum, e) => sum + (e.cancelledLeads || 0), 0);
    const totalWithDamage = entries.reduce((sum, e) => sum + e.leadsWithDamage, 0);
    const totalWithoutDamage = entries.reduce((sum, e) => sum + e.leadsWithoutDamage, 0);
    const closePercent = totalLeadsSet > 0 ? (totalClosed / totalLeadsSet) * 100 : 0;
    const totalPoints = entries.reduce((sum, e) => sum + e.pointsEarned, 0);
    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    
    return { totalLeadsSet, totalClosed, totalDoors, totalConvos, totalNotInterested, totalCancelled, totalWithDamage, totalWithoutDamage, closePercent, totalPoints, totalHours };
  }, [entries]);

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
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Doors</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Convos</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Not Int.</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Leads Set</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">w/ Damage</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">w/o Damage</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Closed</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Close %</th>
              {showHours && (
                <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Hours</th>
              )}
               <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Canceled</th>
              <th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const rowColor = getRowColor(entry.rank);
              const isCurrentUser = entry.userId === currentUserId;
              const closePercent = entry.leadsSet > 0 ? (entry.leadsClosed / entry.leadsSet) * 100 : 0;
              
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
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {entry.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">(You)</span>
                        )}
                      </span>
                      {entry.canvasserRank && (
                        <span className="text-xs opacity-70">{entry.canvasserRank}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">{entry.doorsKnocked}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.conversationsHad || 0}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.notInterested || 0}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsSet}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsWithDamage}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsWithoutDamage || 0}</td>
                  <td className="py-3 px-4 text-right font-bold">{entry.leadsClosed}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {entry.leadsSet > 0 ? `${closePercent.toFixed(1)}%` : '—'}
                  </td>
                  {showHours && (
                    <td className="py-3 px-4 text-right font-bold">{entry.hoursWorked}</td>
                  )}
                  <td className="py-3 px-4 text-right font-bold">{entry.cancelledLeads || 0}</td>
                  <td className="py-3 px-4 text-right">
                    <PointsBreakdownTooltip
                      data={{
                        type: 'canvasser',
                        leadsSet: entry.leadsSet,
                        leadsWithDamage: entry.leadsWithDamage,
                        leadsClosed: entry.leadsClosed,
                        contestPoints: entry.contestPoints || 0,
                        wagerPoints: entry.wagerPoints || 0,
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
          <tfoot className="bg-slate-700 text-white font-bold">
            <tr>
              <td colSpan={2} className="py-3 px-4 text-left">TEAM TOTALS</td>
              <td className="py-3 px-4 text-right">{totals.totalDoors}</td>
              <td className="py-3 px-4 text-right">{totals.totalConvos}</td>
              <td className="py-3 px-4 text-right">{totals.totalNotInterested}</td>
              <td className="py-3 px-4 text-right">{totals.totalLeadsSet}</td>
              <td className="py-3 px-4 text-right">{totals.totalWithDamage}</td>
              <td className="py-3 px-4 text-right">{totals.totalWithoutDamage}</td>
              <td className="py-3 px-4 text-right">{totals.totalClosed}</td>
              <td className="py-3 px-4 text-right">
                {totals.totalLeadsSet > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20">
                    {totals.closePercent.toFixed(1)}%
                  </span>
                ) : '—'}
              </td>
              {showHours && <td className="py-3 px-4 text-right">{totals.totalHours}</td>}
              <td className="py-3 px-4 text-right">{totals.totalCancelled}</td>
              <td className="py-3 px-4 text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20">
                  {totals.totalPoints.toLocaleString()}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
