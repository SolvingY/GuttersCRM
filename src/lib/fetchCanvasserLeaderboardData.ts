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
  // 1. Fetch active, non-hidden profiles
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id, hidden_from_leaderboard')
    .eq('is_archived', false);

  const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);
  const hiddenUserIds = new Set(
    activeProfiles?.filter(p => (p as any).hidden_from_leaderboard).map(p => p.id) || []
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
    if (!activeUserIds.has(d.user_id) || hiddenUserIds.has(d.user_id)) return;

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
      pointsEarned: e.pointsEarned + (Number(d.points_earned) || 0),
    });
  });

  if (aggregated.size === 0) return [];

  // 4. Enrich with display_name and canvasser_rank
  const userIds = Array.from(aggregated.keys());
  const { data: metricsData } = await supabase
    .from('canvasser_metrics')
    .select('user_id, display_name, canvasser_rank')
    .in('user_id', userIds);

  const displayNameMap = new Map<string, string>();
  const rankMap = new Map<string, string>();
  metricsData?.forEach(m => {
    if (m.display_name && !displayNameMap.has(m.user_id)) displayNameMap.set(m.user_id, m.display_name);
    if (m.canvasser_rank && !rankMap.has(m.user_id)) rankMap.set(m.user_id, m.canvasser_rank);
  });

  // 5. Build sorted entries
  const sorted = Array.from(aggregated.entries())
    .filter(([_, d]) =>
      d.leadsSet > 0 || d.leadsClosed > 0 || d.leadsWithDamage > 0 ||
      d.doorsKnocked > 0 || d.pointsEarned > 0
    )
    .sort((a, b) => b[1].pointsEarned - a[1].pointsEarned)
    .map(([userId, d], i) => ({
      rank: i + 1,
      userId,
      name: displayNameMap.get(userId) || 'Anonymous',
      canvasserRank: rankMap.get(userId) || 'C1',
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
