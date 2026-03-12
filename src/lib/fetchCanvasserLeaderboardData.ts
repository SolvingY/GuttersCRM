import { supabase } from '@/integrations/supabase/client';
import type { WeeklyCanvasserEntry } from '@/components/dashboard/WeeklyCanvasserLeaderboardTable';

/**
 * Fetches canvasser leaderboard data by aggregating daily_canvasser_metric_entries
 * for a given date range, then enriching with display_name and canvasser_rank
 * from canvasser_metrics.
 */
export async function fetchCanvasserLeaderboardByDateRange(
  startDate: string,
  endDate: string
): Promise<WeeklyCanvasserEntry[]> {
  // 1. Fetch all profiles (include archived for historical accuracy), exclude hidden
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, hidden_from_leaderboard, is_archived');

  const excludedUserIds = new Set(
    allProfiles?.filter(p => (p as any).hidden_from_leaderboard || (p as any).is_archived).map(p => p.id) || []
  );

  // 2. Query daily_canvasser_metric_entries for the date range
  const { data: dailyData, error } = await supabase
    .from('daily_canvasser_metric_entries')
    .select('user_id, leads_set_delta, leads_closed_delta, leads_with_damage_delta, leads_without_damage_delta, conversations_had_delta, not_interested_delta, cancelled_leads_delta, hours_worked_delta, doors_knocked_delta, income_delta, contracts_delta, points_earned')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate);

  if (error || !dailyData || dailyData.length === 0) {
    return [];
  }

  // 3. Aggregate by user_id
  const aggregated = new Map<string, {
    leadsSet: number; leadsClosed: number; leadsWithDamage: number;
    leadsWithoutDamage: number; conversationsHad: number; notInterested: number;
    cancelledLeads: number; hoursWorked: number; doorsKnocked: number;
    pointsEarned: number;
  }>();

  dailyData.forEach(d => {
    if (hiddenUserIds.has(d.user_id)) return;

    const e = aggregated.get(d.user_id) || {
      leadsSet: 0, leadsClosed: 0, leadsWithDamage: 0, leadsWithoutDamage: 0,
      conversationsHad: 0, notInterested: 0, cancelledLeads: 0,
      hoursWorked: 0, doorsKnocked: 0, pointsEarned: 0,
    };

    aggregated.set(d.user_id, {
      leadsSet: e.leadsSet + (Number(d.leads_set_delta) || 0),
      leadsClosed: e.leadsClosed + (Number(d.leads_closed_delta) || 0),
      leadsWithDamage: e.leadsWithDamage + (Number(d.leads_with_damage_delta) || 0),
      leadsWithoutDamage: e.leadsWithoutDamage + (Number(d.leads_without_damage_delta) || 0),
      conversationsHad: e.conversationsHad + (Number(d.conversations_had_delta) || 0),
      notInterested: e.notInterested + (Number(d.not_interested_delta) || 0),
      cancelledLeads: e.cancelledLeads + (Number(d.cancelled_leads_delta) || 0),
      hoursWorked: e.hoursWorked + (Number(d.hours_worked_delta) || 0),
      doorsKnocked: e.doorsKnocked + (Number(d.doors_knocked_delta) || 0),
      pointsEarned: 0, // will be computed from aggregated fields below
    });
  });

  // Clamp all values to >= 0 (negative deltas from admin corrections can cause sub-zero totals)
  aggregated.forEach((d, userId) => {
    aggregated.set(userId, {
      leadsSet: Math.max(0, d.leadsSet),
      leadsClosed: Math.max(0, d.leadsClosed),
      leadsWithDamage: Math.max(0, d.leadsWithDamage),
      leadsWithoutDamage: Math.max(0, d.leadsWithoutDamage),
      conversationsHad: Math.max(0, d.conversationsHad),
      notInterested: Math.max(0, d.notInterested),
      cancelledLeads: Math.max(0, d.cancelledLeads),
      hoursWorked: Math.max(0, d.hoursWorked),
      doorsKnocked: Math.max(0, d.doorsKnocked),
      pointsEarned: 0,
    });
  });

  if (aggregated.size === 0) return [];

  // 4. Enrich with display_name, canvasser_rank, and contest/wager points
  const userIds = Array.from(aggregated.keys());
  const { data: metricsData } = await supabase
    .from('canvasser_metrics')
    .select('user_id, display_name, canvasser_rank, contest_points, wager_points')
    .in('user_id', userIds);

  const displayNameMap = new Map<string, string>();
  const rankMap = new Map<string, string>();
  const contestPointsMap = new Map<string, number>();
  const wagerPointsMap = new Map<string, number>();
  metricsData?.forEach(m => {
    if (m.display_name && !displayNameMap.has(m.user_id)) displayNameMap.set(m.user_id, m.display_name);
    if (m.canvasser_rank && !rankMap.has(m.user_id)) rankMap.set(m.user_id, m.canvasser_rank);
    if (!contestPointsMap.has(m.user_id)) contestPointsMap.set(m.user_id, Number(m.contest_points) || 0);
    if (!wagerPointsMap.has(m.user_id)) wagerPointsMap.set(m.user_id, Number(m.wager_points) || 0);
  });

  // 5. Build sorted entries
  // Compute points from aggregated performance fields + contest/wager points
  const withPoints = Array.from(aggregated.entries()).map(([userId, d]) => ({
    userId,
    ...d,
    pointsEarned: (d.leadsClosed * 10) + (d.leadsWithDamage * 5) + d.leadsSet + (contestPointsMap.get(userId) || 0) + (wagerPointsMap.get(userId) || 0),
  }));

  const sorted = withPoints
    .filter(d =>
      d.leadsSet > 0 || d.leadsClosed > 0 || d.leadsWithDamage > 0 ||
      d.doorsKnocked > 0 || d.pointsEarned > 0
    )
    .sort((a, b) => b.pointsEarned - a.pointsEarned)
    .map((d, i) => ({
      rank: i + 1,
      userId: d.userId,
      name: displayNameMap.get(d.userId) || 'Anonymous',
      canvasserRank: rankMap.get(d.userId) || 'C1',
      leadsSet: d.leadsSet,
      leadsClosed: d.leadsClosed,
      leadsWithDamage: d.leadsWithDamage,
      leadsWithoutDamage: d.leadsWithoutDamage,
      conversationsHad: d.conversationsHad,
      notInterested: d.notInterested,
      cancelledLeads: d.cancelledLeads,
      hoursWorked: d.hoursWorked,
      doorsKnocked: d.doorsKnocked,
      pointsEarned: d.pointsEarned,
    }));

  return sorted;
}
