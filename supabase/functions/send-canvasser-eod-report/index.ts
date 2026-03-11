import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const testEmail: string | null = body.test_email || null;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get today's date in Chicago timezone
    const now = new Date();
    const chicagoDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    const todayStr = chicagoDate.toISOString().split("T")[0];
    const reportDateFormatted = chicagoDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Get all canvassers
    const { data: canvasserRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "canvasser");

    const allCanvasserIds = (canvasserRoles || []).map((r: any) => r.user_id);

    // Get profiles — filter out archived
    const { data: profiles } = allCanvasserIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, is_archived").in("id", allCanvasserIds)
      : { data: [] };

    const activeProfiles = (profiles || []).filter((p: any) => !p.is_archived);
    const canvasserIds = activeProfiles.map((p: any) => p.id);

    // Get canvasser_metrics display_name for better name resolution
    const { data: canvasserMetrics } = canvasserIds.length > 0
      ? await supabase.from("canvasser_metrics").select("user_id, display_name").in("user_id", canvasserIds)
      : { data: [] };

    // Get shifts for today
    const { data: shifts } = canvasserIds.length > 0
      ? await supabase
          .from("canvasser_shifts")
          .select("*")
          .in("canvasser_id", canvasserIds)
          .gte("clock_in_at", `${todayStr}T00:00:00-06:00`)
          .lt("clock_in_at", `${todayStr}T23:59:59-06:00`)
      : { data: [] };

    // Get daily metric entries for today
    const { data: dailyEntries } = canvasserIds.length > 0
      ? await supabase
          .from("daily_canvasser_metric_entries")
          .select("*")
          .in("user_id", canvasserIds)
          .eq("entry_date", todayStr)
      : { data: [] };

    // Build canvasser rows
    const canvasserData: any[] = [];
    const flaggedShifts: any[] = [];

    for (const cId of canvasserIds) {
      const profile = activeProfiles.find((p: any) => p.id === cId);
      const metric = (canvasserMetrics || []).find((m: any) => m.user_id === cId);
      const name = metric?.display_name || profile?.full_name || "Unknown";
      const shift = (shifts || []).find((s: any) => s.canvasser_id === cId);
      const entries = (dailyEntries || []).filter((e: any) => e.user_id === cId);

      const hasActivity = shift || entries.length > 0;
      if (!hasActivity) continue;

      // Sum daily entries
      const leadsSet = entries.reduce((s: number, e: any) => s + (e.leads_set_delta || 0), 0);
      const leadsClosed = entries.reduce((s: number, e: any) => s + (e.leads_closed_delta || 0), 0);
      const doors = entries.reduce((s: number, e: any) => s + (e.doors_knocked_delta || 0), 0);
      const convos = entries.reduce((s: number, e: any) => s + (e.conversations_had_delta || 0), 0);
      const contracts = entries.reduce((s: number, e: any) => s + (e.contracts_delta || 0), 0);
      const entryNotes = entries.map((e: any) => e.notes).filter(Boolean).join(" | ");

      // Clock times in CT
      let clockIn = "—";
      let clockOut = "—";
      let shiftHours = 0;
      let shiftNotes = "";

      if (shift) {
        const inTime = new Date(shift.clock_in_at);
        clockIn = inTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

        if (shift.clock_out_at) {
          const outTime = new Date(shift.clock_out_at);
          clockOut = outTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
          shiftHours = shift.hours_worked || 0;
        } else {
          clockOut = "Open";
          shiftHours = Math.round(((Date.now() - inTime.getTime()) / 3600000) * 10) / 10;
        }
        shiftNotes = shift.notes || "";

        if (shift.status === "flagged" || shift.flagged_reason) {
          flaggedShifts.push({ name, reason: shift.flagged_reason || "Unknown reason" });
        }
      }

      // Skip canvassers with 0 hours (e.g. admin removed their hours)
      if (shiftHours === 0 && !shift) continue;
      if (shiftHours <= 0 && shift && shift.clock_out_at) continue;

      const allNotes = [shiftNotes, entryNotes].filter(Boolean).join(" | ");
      const truncatedNotes = allNotes.length > 60 ? allNotes.slice(0, 57) + "..." : allNotes;

      canvasserData.push({ name, clockIn, clockOut, hours: shiftHours, leadsSet, leadsClosed, doors, convos, contracts, notes: truncatedNotes, fullNotes: allNotes });
    }

    canvasserData.sort((a, b) => a.name.localeCompare(b.name));

    // Team totals
    const totalHours = canvasserData.reduce((s, c) => s + c.hours, 0);
    const totalLeadsSet = canvasserData.reduce((s, c) => s + c.leadsSet, 0);
    const totalClosed = canvasserData.reduce((s, c) => s + c.leadsClosed, 0);
    const totalDoors = canvasserData.reduce((s, c) => s + c.doors, 0);
    const totalConvos = canvasserData.reduce((s, c) => s + c.convos, 0);
    const totalContracts = canvasserData.reduce((s, c) => s + c.contracts, 0);
    const closeRate = totalLeadsSet > 0 ? ((totalClosed / totalLeadsSet) * 100).toFixed(1) + "%" : "—";

    // Build HTML
    const tableRows = canvasserData.length > 0
      ? canvasserData.map((c) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">${c.name}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${c.clockIn}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${c.clockOut}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${c.hours.toFixed(1)}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${c.doors}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${c.convos}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${c.leadsSet}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${c.leadsClosed}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${c.contracts}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:12px;">${c.notes || "—"}</td>
        </tr>`).join("")
      : `<tr><td colspan="10" style="padding:16px;text-align:center;color:#6b7280;">No canvasser activity recorded today.</td></tr>`;

    const flaggedSection = flaggedShifts.length > 0
      ? `<div style="margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
          <h3 style="margin:0 0 12px;color:#991b1b;">⚠ Flagged Shifts</h3>
          ${flaggedShifts.map((f) => `<p style="margin:4px 0;color:#991b1b;"><strong>${f.name}</strong> — ${f.reason}</p>`).join("")}
        </div>`
      : "";

    const longNotesSection = canvasserData.filter((c) => c.fullNotes && c.fullNotes.length > 60).length > 0
      ? `<div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
          <h3 style="margin:0 0 12px;color:#166534;">📝 Full Notes</h3>
          ${canvasserData.filter((c) => c.fullNotes && c.fullNotes.length > 60).map((c) => `<p style="margin:8px 0;"><strong>${c.name}:</strong> ${c.fullNotes}</p>`).join("")}
        </div>`
      : "";

    const html = `
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;">
      <div style="background:#1e293b;color:white;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;">NGR Canvasser Daily Report</h1>
        <p style="margin:4px 0 0;opacity:0.8;">${reportDateFormatted}</p>
      </div>
      <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#334155;color:white;">
              <th style="padding:10px 12px;text-align:left;">Name</th>
              <th style="padding:10px 12px;text-align:center;">In</th>
              <th style="padding:10px 12px;text-align:center;">Out</th>
              <th style="padding:10px 12px;text-align:right;">Hrs</th>
              <th style="padding:10px 12px;text-align:right;">Doors</th>
              <th style="padding:10px 12px;text-align:right;">Convos</th>
              <th style="padding:10px 12px;text-align:right;">Leads</th>
              <th style="padding:10px 12px;text-align:right;">Closed</th>
              <th style="padding:10px 12px;text-align:right;">Contracts</th>
              <th style="padding:10px 12px;text-align:left;">Notes</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        ${canvasserData.length > 0 ? `
        <div style="margin-top:24px;padding:16px;background:white;border:1px solid #e5e7eb;border-radius:8px;">
          <h3 style="margin:0 0 12px;color:#1e293b;">Team Totals</h3>
          <table style="font-size:14px;">
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Active today:</td><td>${canvasserData.length} of ${canvasserIds.length} canvassers</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Total hours:</td><td>${totalHours.toFixed(1)}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Leads set:</td><td>${totalLeadsSet}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Leads closed:</td><td>${totalClosed}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Close rate:</td><td>${closeRate}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Doors knocked:</td><td>${totalDoors}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Conversations:</td><td>${totalConvos}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;font-weight:600;">Contracts:</td><td>${totalContracts}</td></tr>
          </table>
        </div>` : ""}

        ${flaggedSection}
        ${longNotesSection}

        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
          This report reflects activity logged in the NGR dashboard as of ${chicagoDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })} CT.<br/>
          Contact Kara for discrepancies · <a href="https://oknextgen.com" style="color:#dc2626;">oknextgen.com</a>
        </p>
      </div>
    </div>`;

    // ── Recipients: read from notification_routing table ──
    const { data: routingEntries } = await supabase
      .from("notification_routing")
      .select("email")
      .eq("notification_type", "canvasser_eod_report")
      .eq("is_active", true);

    const routingEmails = (routingEntries || []).map((r: any) => r.email).filter(Boolean);

    // If test_email provided, override recipients
    const recipientEmails = testEmail ? [testEmail] : routingEmails;

    let resendMessageId = null;
    if (recipientEmails.length > 0) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "NGR Reports <reports@oknextgen.com>",
          to: recipientEmails,
          subject: `NGR Canvasser Daily Report — ${reportDateFormatted}`,
          html,
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        resendMessageId = resData.id;
      } else {
        const errText = await res.text();
        console.error("Resend error:", errText);
      }
    }

    // Log to canvasser_eod_report_log
    await supabase.from("canvasser_eod_report_log").insert({
      report_date: todayStr,
      canvassers_included: canvasserData.length,
      recipients: recipientEmails.map((e: string) => ({ email: e })),
      email_sent_at: new Date().toISOString(),
      resend_message_id: resendMessageId,
    } as any);

    return new Response(
      JSON.stringify({ success: true, canvassers: canvasserData.length, recipients: recipientEmails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("EOD Report error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
