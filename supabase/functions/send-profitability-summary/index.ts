import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roleCheck?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const {
      customer_name, job_number, city, state,
      quoted_price, commission_paid, material_cost, labor_cost, other_costs,
      other_costs_description, gross_profit, profit_margin_pct, notes, entered_by_name,
      recipient_emails,
    } = body;

    let emails: string[] = [];

    if (recipient_emails && Array.isArray(recipient_emails) && recipient_emails.length > 0) {
      // Use custom recipient list
      emails = recipient_emails;
    } else {
      // Get all admin emails
      const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
      if (!adminRoles?.length) {
        return new Response(JSON.stringify({ ok: true, skipped: "no admins" }), { headers: corsHeaders });
      }

      const adminIds = adminRoles.map((r: any) => r.user_id);

      // Check profiles for archived status
      const { data: profiles } = await adminClient.from("profiles").select("id").in("id", adminIds).eq("is_archived", false);
      const activeIds = (profiles || []).map((p: any) => p.id);
      if (!activeIds.length) {
        return new Response(JSON.stringify({ ok: true, skipped: "no active admins" }), { headers: corsHeaders });
      }

      for (const uid of activeIds) {
        const { data: { user } } = await adminClient.auth.admin.getUserById(uid);
        if (user?.email) emails.push(user.email);
      }
    }

    if (!emails.length || !resendApiKey) {
      return new Response(JSON.stringify({ ok: true, skipped: "no emails or no resend key" }), { headers: corsHeaders });
    }

    const fmt = (n: number) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const otherLine = other_costs > 0 && other_costs_description ? ` (${other_costs_description})` : "";

    const subject = `Job Profitability — ${customer_name} | ${job_number}`;
    const html = `
<div style="font-family:monospace;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="margin-bottom:4px;">JOB DETAILS</h2>
<p>Customer: ${customer_name}<br/>
Location: ${city}, ${state}<br/>
Job Number: ${job_number}</p>

<h2 style="margin-bottom:4px;">FINANCIALS</h2>
<table style="width:100%;border-collapse:collapse;">
<tr><td>Quoted Price</td><td style="text-align:right">${fmt(quoted_price)}</td></tr>
<tr><td>Commission Paid</td><td style="text-align:right">-${fmt(commission_paid)}</td></tr>
<tr><td>Material Cost</td><td style="text-align:right">-${fmt(material_cost)}</td></tr>
<tr><td>Labor Cost</td><td style="text-align:right">-${fmt(labor_cost)}</td></tr>
<tr><td>Other Costs${otherLine}</td><td style="text-align:right">-${fmt(other_costs)}</td></tr>
<tr><td colspan="2"><hr/></td></tr>
<tr style="font-weight:bold;color:${gross_profit >= 0 ? '#16a34a' : '#dc2626'}">
<td>GROSS PROFIT</td><td style="text-align:right">${fmt(gross_profit)}</td></tr>
<tr style="font-weight:bold;color:${gross_profit >= 0 ? '#16a34a' : '#dc2626'}">
<td>PROFIT MARGIN</td><td style="text-align:right">${profit_margin_pct}%</td></tr>
</table>

${notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${notes}</p>` : ""}
<p style="margin-top:16px;color:#666;">Entered by: ${entered_by_name}</p>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "notifications@oknextgen.com",
        to: emails,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resend error:", errBody);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
