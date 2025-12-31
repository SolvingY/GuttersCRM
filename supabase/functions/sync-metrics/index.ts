import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricPayload {
  user_email: string;
  sales?: number;
  points?: number;
  leads?: number;
  closed_deals?: number;
  metric_date?: string;
}

interface BatchPayload {
  metrics: MetricPayload[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Received sync-metrics request:', JSON.stringify(body));

    // Support both single metric and batch
    const metrics: MetricPayload[] = body.metrics || [body];
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const metric of metrics) {
      const { user_email, sales, points, leads, closed_deals, metric_date } = metric;

      if (!user_email) {
        results.push({ email: 'unknown', success: false, error: 'user_email is required' });
        continue;
      }

      // Find user by email
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error('Error listing users:', userError);
        results.push({ email: user_email, success: false, error: 'Error finding user' });
        continue;
      }

      const user = users.users.find((u) => u.email === user_email);
      
      if (!user) {
        console.log(`User not found for email: ${user_email}`);
        results.push({ email: user_email, success: false, error: 'User not found' });
        continue;
      }

      // Upsert the metric (insert or update based on user_id + metric_date)
      const metricData = {
        user_id: user.id,
        sales: sales ?? 0,
        points: points ?? 0,
        leads: leads ?? 0,
        closed_deals: closed_deals ?? 0,
        metric_date: metric_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('user_metrics')
        .upsert(metricData, {
          onConflict: 'user_id,metric_date',
        });

      if (upsertError) {
        console.error('Error upserting metric:', upsertError);
        results.push({ email: user_email, success: false, error: upsertError.message });
      } else {
        console.log(`Successfully synced metrics for ${user_email}`);
        results.push({ email: user_email, success: true });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Synced ${successCount} metrics, ${failCount} failed`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-metrics:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
