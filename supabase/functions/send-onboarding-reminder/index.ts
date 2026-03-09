import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get recipient settings
    const { data: settings } = await supabase
      .from("report_email_settings")
      .select("*")
      .eq("report_type", "onboarding_reminder")
      .eq("is_active", true)
      .maybeSingle();

    if (!settings || !settings.recipient_emails || settings.recipient_emails.length === 0) {
      return new Response(JSON.stringify({ message: "No recipients configured or report disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get incomplete onboarding profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, start_date, onboarding_complete, is_archived")
      .eq("onboarding_complete", false)
      .eq("is_archived", false);

    if (!profiles || profiles.length === 0) {
      // Send "all clear" email
      const allClearHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a;">✅ All Clear — Onboarding Complete</h2>
          <p>All team members have completed their onboarding. No action needed today.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated daily report from Next Gen Roofing.</p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: "notifications@oknextgen.com",
          to: settings.recipient_emails,
          subject: "✅ Daily Onboarding Status — All Clear",
          html: allClearHtml,
        }),
      });

      return new Response(JSON.stringify({ message: "All clear email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all onboarding steps
    const { data: steps } = await supabase
      .from("onboarding_steps")
      .select("id, step_name, step_key, required, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    // Get all progress records for incomplete users
    const userIds = profiles.map((p: any) => p.id);
    const { data: progress } = await supabase
      .from("user_onboarding_progress")
      .select("user_id, step_id, status, completed_at")
      .in("user_id", userIds);

    // Build report rows
    const reportRows = profiles.map((profile: any) => {
      const userProgress = (progress || []).filter((p: any) => p.user_id === profile.id);
      const completedStepIds = new Set(userProgress.filter((p: any) => p.status === "completed").map((p: any) => p.step_id));
      
      const completedSteps = (steps || []).filter((s: any) => completedStepIds.has(s.id));
      const pendingSteps = (steps || []).filter((s: any) => !completedStepIds.has(s.id));
      const totalSteps = steps?.length || 0;

      return {
        name: profile.full_name || "Unknown",
        startDate: profile.start_date,
        completedCount: completedSteps.length,
        totalSteps,
        completedSteps: completedSteps.map((s: any) => s.step_name),
        pendingSteps: pendingSteps.map((s: any) => s.step_name),
      };
    });

    // Build HTML email
    const memberRows = reportRows
      .map(
        (r) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${r.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${r.startDate ? new Date(r.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.completedCount} / ${r.totalSteps}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${r.pendingSteps.length > 0 ? r.pendingSteps.map((s) => `<span style="display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin: 2px;">❌ ${s}</span>`).join("") : '<span style="color: #16a34a;">✅ All done</span>'}
        </td>
      </tr>
    `
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e293b; margin-bottom: 4px;">📋 Daily Onboarding Status</h2>
        <p style="color: #64748b; margin-top: 0;">${reportRows.length} team member${reportRows.length > 1 ? "s" : ""} need${reportRows.length === 1 ? "s" : ""} attention</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #475569;">Name</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #475569;">Start Date</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 13px; color: #475569;">Progress</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #475569;">Pending Steps</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows}
          </tbody>
        </table>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This is an automated daily report from Next Gen Roofing. Sent at ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT.</p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: "notifications@oknextgen.com",
        to: settings.recipient_emails,
        subject: `📋 Daily Onboarding Status — ${reportRows.length} team member${reportRows.length > 1 ? "s" : ""} need attention`,
        html,
      }),
    });

    const emailResult = await emailRes.text();

    return new Response(JSON.stringify({ message: "Report sent", recipients: settings.recipient_emails.length, incomplete: reportRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
