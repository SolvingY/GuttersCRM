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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Fetch daily logs that have actual EOD submissions (not just clock-out auto-rows)
    const { data: logs, error: logsError } = await supabase
      .from("production_daily_logs")
      .select("*")
      .eq("log_date", today)
      .eq("email_sent", false)
      .or("summary_notes.not.is.null,builds_completed.gt.0");

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch daily logs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!logs || logs.length === 0) {
      console.log("No production logs to send for", today);
      return new Response(
        JSON.stringify({ message: "No logs to send" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get display names from profiles
    const userIds = logs.map((l: any) => l.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || "Unknown"]));

    // Get recipient emails from report_settings
    const { data: settingsData } = await supabase
      .from("report_settings")
      .select("setting_value")
      .eq("setting_key", "production_eod_recipients")
      .maybeSingle();

    let recipientEmails: string[] = [];
    if (settingsData?.setting_value) {
      const val = settingsData.setting_value;
      if (Array.isArray(val)) {
        recipientEmails = val as string[];
      } else if (typeof val === "object" && val !== null && "emails" in val) {
        recipientEmails = (val as any).emails || [];
      }
    }

    if (recipientEmails.length === 0) {
      console.log("No recipients configured for production EOD summary");
      return new Response(
        JSON.stringify({ message: "No recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build HTML table
    const formattedDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tableRows = logs
      .map((log: any) => {
        const name = nameMap.get(log.user_id) || "Unknown";
        const tasks = Array.isArray(log.tasks_completed) && log.tasks_completed.length > 0
          ? `<ul style="margin: 4px 0 0; padding-left: 18px; font-size: 13px;">${log.tasks_completed.map((t: any) => `<li>${t.text || ""}</li>`).join("")}</ul>`
          : "";
        return `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb;">${name}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">${log.builds_completed}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">${log.checklists_submitted}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">${log.hours_worked ? Number(log.hours_worked).toFixed(1) : "—"}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb;">${log.summary_notes || "—"}${tasks}</td>
          </tr>
        `;
      })
      .join("");

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px 25px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">NGR Production Daily Summary</h1>
          <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">${formattedDate}</p>
        </div>
        <div style="padding: 20px 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 15px; text-align: left; border-bottom: 2px solid #e5e7eb;">Contractor</th>
                <th style="padding: 10px 15px; text-align: center; border-bottom: 2px solid #e5e7eb;">Builds</th>
                <th style="padding: 10px 15px; text-align: center; border-bottom: 2px solid #e5e7eb;">Checklists</th>
                <th style="padding: 10px 15px; text-align: center; border-bottom: 2px solid #e5e7eb;">Hours</th>
                <th style="padding: 10px 15px; text-align: left; border-bottom: 2px solid #e5e7eb;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
            Total contractors reporting: ${logs.length}
          </p>
        </div>
      </div>
    `;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "NGR Production <notifications@oknextgen.com>",
        to: recipientEmails,
        subject: `NGR Production Daily Summary — ${formattedDate}`,
        html: htmlBody,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error("Resend error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark logs as sent
    const logIds = logs.map((l: any) => l.id);
    await supabase
      .from("production_daily_logs")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .in("id", logIds);

    console.log(`Production EOD summary sent to ${recipientEmails.join(", ")} with ${logs.length} entries`);

    return new Response(
      JSON.stringify({ success: true, logsSent: logs.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
