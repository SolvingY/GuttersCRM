import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contest {
  id: string;
  title: string;
  metric_type: string;
  target_role: string;
  points_awarded: boolean;
  end_date: string;
}

interface Winner {
  userId: string;
  displayName: string;
  value: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { contestId } = await req.json();

    console.log('finalize-contest: Starting for contest:', contestId);

    // Fetch the contest
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (contestError || !contest) {
      console.error('finalize-contest: Contest not found:', contestError);
      return new Response(
        JSON.stringify({ error: 'Contest not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contest.points_awarded) {
      console.log('finalize-contest: Points already awarded for this contest');
      return new Response(
        JSON.stringify({ error: 'Points already awarded for this contest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if contest has ended
    const now = new Date();
    const endDate = new Date(contest.end_date);
    if (now < endDate) {
      console.log('finalize-contest: Contest has not ended yet');
      return new Response(
        JSON.stringify({ error: 'Contest has not ended yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('finalize-contest: Contest details:', { 
      title: contest.title, 
      metric_type: contest.metric_type, 
      target_role: contest.target_role 
    });

    // Determine which table to query based on target_role
    const isCanvasserContest = contest.target_role === 'canvasser';
    const tableName = isCanvasserContest ? 'canvasser_metrics' : 'user_metrics';

    // Fetch metrics and calculate winners
    let winners: Winner[] = [];

    if (isCanvasserContest) {
      // Handle conversion_rate as a calculated field
      if (contest.metric_type === 'conversion_rate') {
        const { data: metricsData, error: metricsError } = await supabase
          .from('canvasser_metrics')
          .select('user_id, display_name, leads_set, leads_closed');

        if (metricsError) {
          console.error('finalize-contest: Error fetching metrics:', metricsError);
          throw metricsError;
        }

        // Get latest per user and calculate conversion rate
        const latestByUser = new Map<string, { name: string; value: number }>();
        for (const item of metricsData || []) {
          if (!latestByUser.has(item.user_id)) {
            const conversionRate = item.leads_set > 0 
              ? (item.leads_closed / item.leads_set) * 100 
              : 0;
            latestByUser.set(item.user_id, {
              name: item.display_name || 'Unknown',
              value: conversionRate,
            });
          }
        }

        winners = Array.from(latestByUser.entries())
          .map(([userId, data]) => ({ userId, displayName: data.name, value: data.value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);
      } else {
      const { data: metricsData, error: metricsError } = await supabase
        .from('canvasser_metrics')
        .select('user_id, display_name, leads_set, leads_closed, leads_with_damage, shifts_worked, points');

      if (metricsError) {
        console.error('finalize-contest: Error fetching metrics:', metricsError);
        throw metricsError;
      }

      const latestByUser = new Map<string, { name: string; value: number }>();
      for (const item of (metricsData || []) as any[]) {
        if (!latestByUser.has(item.user_id)) {
          let value = 0;
          if (contest.metric_type === 'leads_set') {
            value = Number(item.leads_set) || 0;
          } else if (contest.metric_type === 'leads_closed') {
            value = Number(item.leads_closed) || 0;
          } else if (contest.metric_type === 'shifts_worked') {
            value = Number(item.shifts_worked) || 0;
          } else if (contest.metric_type === 'points') {
            value = Number(item.points) || 0;
          }
          latestByUser.set(item.user_id, {
            name: item.display_name || 'Unknown',
            value,
          });
        }
      }

      winners = Array.from(latestByUser.entries())
        .map(([userId, data]) => ({ userId, displayName: data.name, value: data.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    }
    } else {
      // Sales rep contest
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_metrics')
        .select('user_id, display_name, sales, leads, closed_deals')
        .order('metric_date', { ascending: false });

      if (metricsError) {
        console.error('finalize-contest: Error fetching metrics:', metricsError);
        throw metricsError;
      }

      const latestByUser = new Map<string, { name: string; value: number }>();
      for (const item of (metricsData || []) as any[]) {
        if (!latestByUser.has(item.user_id)) {
          let value = 0;
          if (contest.metric_type === 'sales') {
            value = Number(item.sales) || 0;
          } else if (contest.metric_type === 'leads') {
            value = Number(item.leads) || 0;
          } else if (contest.metric_type === 'closed_deals') {
            value = Number(item.closed_deals) || 0;
          }
          latestByUser.set(item.user_id, {
            name: item.display_name || 'Unknown',
            value,
          });
        }
      }

      winners = Array.from(latestByUser.entries())
        .map(([userId, data]) => ({ userId, displayName: data.name, value: data.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    }

    console.log('finalize-contest: Winners determined:', winners);

    if (winners.length === 0) {
      console.log('finalize-contest: No participants found');
      return new Response(
        JSON.stringify({ error: 'No participants found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award points: 1st = 100, 2nd = 50, 3rd = 25
    const pointsToAward = [100, 50, 25];
    
    for (let i = 0; i < winners.length && i < 3; i++) {
      const winner = winners[i];
      const points = pointsToAward[i];

      console.log(`finalize-contest: Awarding ${points} points to ${winner.displayName} (${winner.userId})`);

      // Update user's points in their metrics table
      if (isCanvasserContest) {
        // Get current points
        const { data: currentMetrics } = await supabase
          .from('canvasser_metrics')
          .select('id, points')
          .eq('user_id', winner.userId)
          .order('metric_date', { ascending: false })
          .limit(1)
          .single();

        if (currentMetrics) {
          const newPoints = (Number(currentMetrics.points) || 0) + points;
          await supabase
            .from('canvasser_metrics')
            .update({ points: newPoints })
            .eq('id', currentMetrics.id);
        }
      } else {
        // Get current points for sales rep
        const { data: currentMetrics } = await supabase
          .from('user_metrics')
          .select('id, points')
          .eq('user_id', winner.userId)
          .order('metric_date', { ascending: false })
          .limit(1)
          .single();

        if (currentMetrics) {
          const newPoints = (Number(currentMetrics.points) || 0) + points;
          await supabase
            .from('user_metrics')
            .update({ points: newPoints })
            .eq('id', currentMetrics.id);
        }
      }

      // Record victory in contest_victories table
      const { error: victoryError } = await supabase
        .from('contest_victories')
        .insert({
          contest_id: contestId,
          user_id: winner.userId,
          place: i + 1,
          points_awarded: points,
          acknowledged: false,
        });

      if (victoryError) {
        console.error('finalize-contest: Error recording victory:', victoryError);
      }
    }

    // Update contest with winner info and mark as points_awarded
    const updateData: any = {
      points_awarded: true,
      winner_user_id: winners[0]?.userId || null,
      winner_display_name: winners[0]?.displayName || null,
      winner_value: winners[0]?.value || null,
    };

    if (winners[1]) {
      updateData.winner_2nd_user_id = winners[1].userId;
      updateData.winner_2nd_display_name = winners[1].displayName;
    }

    if (winners[2]) {
      updateData.winner_3rd_user_id = winners[2].userId;
      updateData.winner_3rd_display_name = winners[2].displayName;
    }

    const { error: updateError } = await supabase
      .from('contests')
      .update(updateData)
      .eq('id', contestId);

    if (updateError) {
      console.error('finalize-contest: Error updating contest:', updateError);
      throw updateError;
    }

    console.log('finalize-contest: Contest finalized successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contest finalized successfully',
        winners: winners.map((w, i) => ({
          place: i + 1,
          displayName: w.displayName,
          value: w.value,
          pointsAwarded: pointsToAward[i],
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('finalize-contest: Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
