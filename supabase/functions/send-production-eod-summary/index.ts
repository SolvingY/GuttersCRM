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

    // Parse optional body params
    let body: any = {};
    try { body = await req.json(); } catch {}

    let startDate: string;
    let endDate: string;
    let isRange = false;
    let isManual = false;

    if (body.start_date && body.end_date) {
      startDate = body.start_date;
      endDate = body.end_date;
      isRange = startDate !== endDate;
      isManual = true;
    } else if (body.report_date) {
      startDate = body.report_date;
      endDate = body.report_date;
      isManual = true;
    } else {
      // Default: today
      startDate = new Date().toISOString().split("T")[0];
      endDate = startDate;
    }

    // Fetch logs – for manual/historical reports, don't filter by email_sent
    let query = supabase
      .from("production_daily_logs")
      .select("*")
      .gte("log_date", startDate)
      .lte("log_date", endDate);

    if (!isManual) {
      // Nightly auto-send: only unsent logs with actual content
      query = query.eq("email_sent", false)
        .or("summary_notes.not.is.null,builds_completed.gt.0");
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch daily logs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!logs || logs.length === 0) {
      console.log("No production logs to send for", startDate, "-", endDate);
      return new Response(
        JSON.stringify({ message: "No logs to send", logsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate per user
    const userAgg = new Map<string, { builds: number; checklists: number; hours: number; notes: string[]; tasks: string[] }>();
    for (const log of logs as any[]) {
      const uid = log.user_id;
      if (!userAgg.has(uid)) {
        userAgg.set(uid, { builds: 0, checklists: 0, hours: 0, notes: [], tasks: [] });
      }
      const agg = userAgg.get(uid)!;
      agg.builds += Number(log.builds_completed) || 0;
      agg.checklists += Number(log.checklists_submitted) || 0;
      agg.hours += Number(log.hours_worked) || 0;
      if (log.summary_notes) agg.notes.push(log.summary_notes);
      if (Array.isArray(log.tasks_completed)) {
        for (const t of log.tasks_completed) {
          if (t?.text) agg.tasks.push(t.text);
        }
      }
    }

    // Get display names
    const userIds = Array.from(userAgg.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || "Unknown"]));

    // Get recipients (or use test_email override)
    let recipientEmails: string[] = [];
    if (body.test_email) {
      recipientEmails = [body.test_email];
    } else {
      const { data: settingsData } = await supabase
        .from("report_settings")
        .select("setting_value")
        .eq("setting_key", "production_eod_recipients")
        .maybeSingle();

      if (settingsData?.setting_value) {
        const val = settingsData.setting_value;
        if (Array.isArray(val)) {
          recipientEmails = val as string[];
        } else if (typeof val === "object" && val !== null && "emails" in val) {
          recipientEmails = (val as any).emails || [];
        }
      }
    }

    if (recipientEmails.length === 0) {
      console.log("No recipients configured for production EOD summary");
      return new Response(
        JSON.stringify({ message: "No recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date header
    const formatDisplayDate = (dateStr: string) => {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };

    let dateHeader: string;
    let subjectDate: string;
    if (isRange) {
      const s = new Date(startDate + "T12:00:00");
      const e = new Date(endDate + "T12:00:00");
      const sStr = s.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const eStr = e.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      dateHeader = `${sStr} – ${eStr}`;
      subjectDate = dateHeader;
    } else {
      dateHeader = formatDisplayDate(startDate);
      subjectDate = dateHeader;
    }

    // Build HTML table
    const tableRows = Array.from(userAgg.entries())
      .map(([uid, agg]) => {
        const name = nameMap.get(uid) || "Unknown";
        const tasksHtml = agg.tasks.length > 0
          ? `<ul style="margin: 4px 0 0; padding-left: 18px; font-size: 13px;">${agg.tasks.map(t => `<li>${t}</li>`).join("")}</ul>`
          : "";
        const notesStr = agg.notes.filter(Boolean).join("; ") || "—";
        return `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb;">${name}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">${agg.builds}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">${agg.checklists}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: center;">${agg.hours ? agg.hours.toFixed(1) : "—"}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb;">${notesStr}${tasksHtml}</td>
          </tr>
        `;
      })
      .join("");

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px 25px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">NGR Production ${isRange ? "Summary Report" : "Daily Summary"}</h1>
          <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">${dateHeader}</p>
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
            Total contractors reporting: ${userAgg.size}${isRange ? ` · Logs aggregated: ${logs.length}` : ""}
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
        subject: `NGR Production ${isRange ? "Summary" : "Daily Summary"} — ${subjectDate}`,
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

    // Only mark as sent for nightly auto-runs (not manual/historical)
    if (!isManual) {
      const logIds = (logs as any[]).map((l: any) => l.id);
      await supabase
        .from("production_daily_logs")
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .in("id", logIds);
    }

    console.log(`Production EOD summary sent to ${recipientEmails.join(", ")} with ${userAgg.size} contractors (${logs.length} log entries)`);

    return new Response(
      JSON.stringify({ success: true, logsSent: logs.length, contractors: userAgg.size, recipients: recipientEmails.length }),
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
