import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, addDays, format } from 'date-fns';

/**
 * Shared 3-tier update utility for canvasser hours/doors.
 * Used by both clock-out flow AND admin shift edit flow.
 * 
 * @param userId - canvasser user ID
 * @param shiftDate - the date the shift occurred (use clock_in_at date)
 * @param hoursDelta - positive to add, negative to subtract
 * @param doorsDelta - positive to add, negative to subtract
 */
export async function updateCanvasserHours(
  userId: string,
  shiftDate: Date,
  hoursDelta: number,
  doorsDelta: number = 0,
  convosDelta: number = 0,
  notInterestedDelta: number = 0,
  leadsSetDelta: number = 0
) {
  const entryDate = format(shiftDate, 'yyyy-MM-dd');
  const weekStartDate = startOfWeek(shiftDate, { weekStartsOn: 4 }); // Thursday
  const weekStart = format(weekStartDate, 'yyyy-MM-dd');
  const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd');

  // TIER 1: Daily entry
  const { data: existing } = await supabase
    .from('daily_canvasser_metric_entries')
    .select('id, hours_worked_delta, doors_knocked_delta, conversations_had_delta, not_interested_delta, leads_set_delta')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('daily_canvasser_metric_entries')
      .update({
        hours_worked_delta: Math.max(0, (Number(existing.hours_worked_delta) || 0) + hoursDelta),
        doors_knocked_delta: Math.max(0, (Number(existing.doors_knocked_delta) || 0) + doorsDelta),
        conversations_had_delta: Math.max(0, (Number(existing.conversations_had_delta) || 0) + convosDelta),
        not_interested_delta: Math.max(0, (Number(existing.not_interested_delta) || 0) + notInterestedDelta),
        leads_set_delta: Math.max(0, (Number(existing.leads_set_delta) || 0) + leadsSetDelta),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('daily_canvasser_metric_entries')
      .insert({
        user_id: userId,
        entry_date: entryDate,
        hours_worked_delta: Math.max(0, hoursDelta),
        doors_knocked_delta: Math.max(0, doorsDelta),
        conversations_had_delta: Math.max(0, convosDelta),
        not_interested_delta: Math.max(0, notInterestedDelta),
        leads_set_delta: Math.max(0, leadsSetDelta),
      });
  }

  // TIER 2: Weekly aggregate
  const { data: weeklyRow } = await supabase
    .from('weekly_canvasser_metrics')
    .select('id, hours_worked, doors_knocked, conversations_had, not_interested, leads_set')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (weeklyRow) {
    await supabase
      .from('weekly_canvasser_metrics')
      .update({
        hours_worked: Math.max(0, (Number(weeklyRow.hours_worked) || 0) + hoursDelta),
        doors_knocked: Math.max(0, (Number(weeklyRow.doors_knocked) || 0) + doorsDelta),
        conversations_had: Math.max(0, (Number(weeklyRow.conversations_had) || 0) + convosDelta),
        not_interested: Math.max(0, (Number(weeklyRow.not_interested) || 0) + notInterestedDelta),
        leads_set: Math.max(0, (Number(weeklyRow.leads_set) || 0) + leadsSetDelta),
      })
      .eq('id', weeklyRow.id);
  } else {
    await supabase
      .from('weekly_canvasser_metrics')
      .insert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        hours_worked: Math.max(0, hoursDelta),
        doors_knocked: Math.max(0, doorsDelta),
        conversations_had: Math.max(0, convosDelta),
        not_interested: Math.max(0, notInterestedDelta),
        leads_set: Math.max(0, leadsSetDelta),
      });
  }

  // TIER 3: YTD running total
  const { data: ytdRow } = await supabase
    .from('canvasser_metrics')
    .select('id, hours_worked, doors_knocked, conversations_had, not_interested, leads_set')
    .eq('user_id', userId)
    .maybeSingle();

  if (ytdRow) {
    await supabase
      .from('canvasser_metrics')
      .update({
        hours_worked: Math.max(0, (Number(ytdRow.hours_worked) || 0) + hoursDelta),
        doors_knocked: Math.max(0, (Number(ytdRow.doors_knocked) || 0) + doorsDelta),
        conversations_had: Math.max(0, (Number(ytdRow.conversations_had) || 0) + convosDelta),
        not_interested: Math.max(0, (Number(ytdRow.not_interested) || 0) + notInterestedDelta),
        leads_set: Math.max(0, (Number(ytdRow.leads_set) || 0) + leadsSetDelta),
      })
      .eq('id', ytdRow.id);
  }
}
