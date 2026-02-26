import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, addDays } from 'date-fns';

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
  doorsDelta: number = 0
) {
  const entryDate = shiftDate.toISOString().split('T')[0];
  const weekStartDate = startOfWeek(shiftDate, { weekStartsOn: 4 }); // Thursday
  const weekStart = weekStartDate.toISOString().split('T')[0];
  const weekEnd = addDays(weekStartDate, 6).toISOString().split('T')[0];

  // TIER 1: Daily entry
  const { data: existing } = await supabase
    .from('daily_canvasser_metric_entries')
    .select('id, hours_worked_delta, doors_knocked_delta')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('daily_canvasser_metric_entries')
      .update({
        hours_worked_delta: Math.max(0, (Number(existing.hours_worked_delta) || 0) + hoursDelta),
        doors_knocked_delta: Math.max(0, (Number(existing.doors_knocked_delta) || 0) + doorsDelta),
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
      });
  }

  // TIER 2: Weekly aggregate
  const { data: weeklyRow } = await supabase
    .from('weekly_canvasser_metrics')
    .select('id, hours_worked, doors_knocked')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (weeklyRow) {
    await supabase
      .from('weekly_canvasser_metrics')
      .update({
        hours_worked: Math.max(0, (Number(weeklyRow.hours_worked) || 0) + hoursDelta),
        doors_knocked: Math.max(0, (Number(weeklyRow.doors_knocked) || 0) + doorsDelta),
      })
      .eq('id', weeklyRow.id);
  } else {
    await supabase
      .from('weekly_canvasser_metrics')
      .insert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd, // REQUIRED: NOT NULL constraint
        hours_worked: Math.max(0, hoursDelta),
        doors_knocked: Math.max(0, doorsDelta),
      });
  }

  // TIER 3: YTD running total
  const { data: ytdRow } = await supabase
    .from('canvasser_metrics')
    .select('id, hours_worked, doors_knocked')
    .eq('user_id', userId)
    .maybeSingle();

  if (ytdRow) {
    await supabase
      .from('canvasser_metrics')
      .update({
        hours_worked: Math.max(0, (Number(ytdRow.hours_worked) || 0) + hoursDelta),
        doors_knocked: Math.max(0, (Number(ytdRow.doors_knocked) || 0) + doorsDelta),
      })
      .eq('id', ytdRow.id);
  }
}
