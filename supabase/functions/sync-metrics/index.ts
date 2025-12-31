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

// Input validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function isValidNumber(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 999999999;
}

function isValidDate(dateStr: string | undefined): boolean {
  if (!dateStr) return true;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ===== AUTHENTICATION =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with user's auth for verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Extract and validate JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.log('Invalid auth token:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log(`Authenticated user: ${user.email} (${user.id})`);

    // ===== AUTHORIZATION - Admin only =====
    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Error checking admin role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!isAdmin) {
      console.log(`User ${user.email} is not an admin`);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`Admin access verified for ${user.email}`);

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Received sync-metrics request:', JSON.stringify(body));

    // Support both single metric and batch
    const metrics: MetricPayload[] = body.metrics || [body];
    const results: { email: string; success: boolean; error?: string }[] = [];

    // ===== INPUT VALIDATION =====
    for (const metric of metrics) {
      const { user_email, sales, points, leads, closed_deals, metric_date } = metric;

      // Validate email
      if (!user_email) {
        results.push({ email: 'unknown', success: false, error: 'user_email is required' });
        continue;
      }

      if (!isValidEmail(user_email)) {
        results.push({ email: user_email, success: false, error: 'Invalid email format' });
        continue;
      }

      // Validate numeric fields
      if (!isValidNumber(sales)) {
        results.push({ email: user_email, success: false, error: 'Invalid sales value' });
        continue;
      }

      if (!isValidNumber(points)) {
        results.push({ email: user_email, success: false, error: 'Invalid points value' });
        continue;
      }

      if (!isValidNumber(leads)) {
        results.push({ email: user_email, success: false, error: 'Invalid leads value' });
        continue;
      }

      if (!isValidNumber(closed_deals)) {
        results.push({ email: user_email, success: false, error: 'Invalid closed_deals value' });
        continue;
      }

      // Validate date
      if (!isValidDate(metric_date)) {
        results.push({ email: user_email, success: false, error: 'Invalid metric_date format (use YYYY-MM-DD)' });
        continue;
      }

      // Find user by email
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        results.push({ email: user_email, success: false, error: 'Error finding user' });
        continue;
      }

      const targetUser = users.users.find((u) => u.email === user_email);
      
      if (!targetUser) {
        console.log(`User not found for email: ${user_email}`);
        results.push({ email: user_email, success: false, error: 'User not found' });
        continue;
      }

      // Upsert the metric (insert or update based on user_id + metric_date)
      const metricData = {
        user_id: targetUser.id,
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
        console.log(`Successfully synced metrics for ${user_email} by admin ${user.email}`);
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
  }
});
