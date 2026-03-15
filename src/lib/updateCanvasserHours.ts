import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, addDays } from 'date-fns';

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

  // TIER 1: Daily entry
  const { data: existing, error: selectError } = await supabase
    .from('daily_canvasser_metric_entries')
    .select('id, hours_worked_delta, doors_knocked_delta, conversations_had_delta, not_interested_delta, leads_set_delta')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to fetch daily metrics: ${selectError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabase
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

    if (updateError) {
      throw new Error(`Failed to update daily metrics: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
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

    if (insertError) {
      throw new Error(`Failed to insert daily metrics: ${insertError.message}`);
    }
  }

  // TIER 2: Removed — leaderboard now aggregates from daily_canvasser_metric_entries directly

  // TIER 3: YTD running total
  const { data: ytdRow, error: ytdSelectError } = await supabase
    .from('canvasser_metrics')
    .select('id, hours_worked, doors_knocked, conversations_had, not_interested, leads_set')
    .eq('user_id', userId)
    .maybeSingle();

  if (ytdSelectError) {
    throw new Error(`Failed to fetch YTD metrics: ${ytdSelectError.message}`);
  }

  if (ytdRow) {
    const { error: ytdUpdateError } = await supabase
      .from('canvasser_metrics')
      .update({
        hours_worked: Math.max(0, (Number(ytdRow.hours_worked) || 0) + hoursDelta),
        doors_knocked: Math.max(0, (Number(ytdRow.doors_knocked) || 0) + doorsDelta),
        conversations_had: Math.max(0, (Number(ytdRow.conversations_had) || 0) + convosDelta),
        not_interested: Math.max(0, (Number(ytdRow.not_interested) || 0) + notInterestedDelta),
        leads_set: Math.max(0, (Number(ytdRow.leads_set) || 0) + leadsSetDelta),
      })
      .eq('id', ytdRow.id);

    if (ytdUpdateError) {
      throw new Error(`Failed to update YTD metrics: ${ytdUpdateError.message}`);
    }
  }
}
