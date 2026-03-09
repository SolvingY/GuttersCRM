import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { checklistType, submissionId, recipients, senderName } = await req.json();

    if (!checklistType || !submissionId || !recipients?.length || !senderName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    // Use service role for DB operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch submission
    let submission: any;
    let photoPaths: string[] = [];
    let photoStorageBucket = "hail-assessment-photos";

    if (checklistType === "hail_assessment") {
      const { data, error } = await adminClient
        .from("commercial_hail_assessments")
        .select("*")
        .eq("id", submissionId)
        .single();
      if (error || !data) throw new Error("Assessment not found");
      submission = data;
      photoPaths = Array.isArray(data.photo_paths) ? (data.photo_paths as string[]) : [];
    } else if (checklistType === "production_checklist") {
      const { data, error } = await adminClient
        .from("production_checklist_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();
      if (error || !data) throw new Error("Checklist submission not found");
      submission = data;
      // Production checklists may not have photos
      photoPaths = [];
    } else {
      return new Response(JSON.stringify({ error: "Invalid checklistType" }), { status: 400, headers: corsHeaders });
    }

    // Count photos (do not embed)
    const photoCount = photoPaths.length;

    // Collect doc links
    const formData = submission.form_data || {};
    const docLinks: string[] = [];
    if (formData.docLinks) {
      Object.values(formData.docLinks).forEach((link: any) => {
        if (link && typeof link === "string" && link.trim()) docLinks.push(link.trim());
      });
    }
    if (formData.resultDocLinks) {
      Object.values(formData.resultDocLinks).forEach((link: any) => {
        if (link && typeof link === "string" && link.trim()) docLinks.push(link.trim());
      });
    }
    if (submission.result_doc_link) docLinks.push(submission.result_doc_link);

    // Build result label
    const resultLabels: Record<string, string> = {
      no_damage: "No Damage",
      possible_damage: "Possible Damage",
      confirmed_damage: "Confirmed Damage",
    };
    const resultLabel = submission.result ? (resultLabels[submission.result] || submission.result) : "N/A";
    const resultColor = submission.result === "no_damage" ? "#16a34a" : submission.result === "possible_damage" ? "#f59e0b" : submission.result === "confirmed_damage" ? "#dc2626" : "#6b7280";

    // Build checklist summary
    let checkedCount = 0;
    let totalItems = 0;
    if (formData.checked) {
      const entries = Object.entries(formData.checked);
      totalItems = entries.length;
      checkedCount = entries.filter(([, v]) => v === true).length;
    }

    // Format dates
    const inspectionDate = submission.inspection_date
      ? new Date(submission.inspection_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "N/A";
    const submittedDate = (submission.saved_at || submission.created_at)
      ? new Date(submission.saved_at || submission.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "N/A";

    // Report type title
    const reportTitle = checklistType === "hail_assessment"
      ? "Commercial Hail Assessment Report"
      : "Production Checklist Report";

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background:#1a1a1a;padding:24px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Next Gen Roofing</h1>
        <p style="margin:4px 0 0;color:#999;font-size:13px;">${reportTitle}</p>
      </td>
    </tr>

    <!-- Job Info -->
    <tr>
      <td style="padding:24px 32px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">${submission.property_name || "Untitled Property"}</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
          ${submission.address ? `<tr><td style="padding:4px 0;color:#6b7280;width:120px;">Address</td><td style="padding:4px 0;">${escapeHtml(submission.address)}</td></tr>` : ""}
          ${submission.homeowner_name ? `<tr><td style="padding:4px 0;color:#6b7280;">Homeowner</td><td style="padding:4px 0;">${escapeHtml(submission.homeowner_name)}</td></tr>` : ""}
          ${submission.homeowner_phone ? `<tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;">${escapeHtml(submission.homeowner_phone)}</td></tr>` : ""}
          ${submission.homeowner_email ? `<tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;">${escapeHtml(submission.homeowner_email)}</td></tr>` : ""}
          <tr><td style="padding:4px 0;color:#6b7280;">Inspector</td><td style="padding:4px 0;">${escapeHtml(submission.inspector_name || senderName)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Inspection Date</td><td style="padding:4px 0;">${inspectionDate}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Submitted</td><td style="padding:4px 0;">${submittedDate}</td></tr>
        </table>
      </td>
    </tr>

    <!-- Result -->
    ${submission.result ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:${resultColor};color:#fff;padding:6px 16px;border-radius:6px;font-size:14px;font-weight:600;">${resultLabel}</td>
        </tr></table>
      </td>
    </tr>` : ""}

    <!-- Report Notes -->
    ${submission.report_notes ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;">Report Notes</p>
        <p style="margin:0;font-size:14px;color:#374151;background:#f3f4f6;padding:12px;border-radius:8px;">${escapeHtml(submission.report_notes)}</p>
      </td>
    </tr>` : ""}

    ${submission.result_notes ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;">Result Notes</p>
        <p style="margin:0;font-size:14px;color:#374151;background:#f3f4f6;padding:12px;border-radius:8px;">${escapeHtml(submission.result_notes)}</p>
      </td>
    </tr>` : ""}

    <!-- Checklist Summary -->
    ${totalItems > 0 ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0;font-size:14px;color:#374151;">
          <strong>${checkedCount}</strong> of <strong>${totalItems}</strong> items checked
        </p>
      </td>
    </tr>` : ""}

    <!-- Photos -->
    ${photoCount > 0 ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0;font-size:14px;color:#374151;">
          📷 <strong>${photoCount}</strong> photo${photoCount !== 1 ? "s" : ""} documented
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Full photo set accessible via the NGR Dashboard.</p>
      </td>
    </tr>` : ""}

    <!-- Doc Links -->
    ${docLinks.length > 0 ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;">Attached Documents</p>
        ${docLinks.map((link) => `<p style="margin:0 0 4px;"><a href="${escapeHtml(link)}" style="color:#2563eb;font-size:13px;text-decoration:underline;">${escapeHtml(link)}</a></p>`).join("")}
      </td>
    </tr>` : ""}

    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sent from NGR Dashboard · <a href="https://oknextgen.com" style="color:#9ca3af;">oknextgen.com</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const toEmails = recipients.map((r: any) => r.email);
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "NGR Reports <notifications@oknextgen.com>",
        to: toEmails,
        subject: `${reportTitle}: ${submission.property_name || "Inspection"}`,
        html,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) throw new Error(resendData?.message || "Resend API error");

    // Log the email
    await adminClient.from("report_email_log").insert({
      checklist_type: checklistType,
      submission_id: submissionId,
      sent_by: userId,
      recipients,
      resend_message_id: resendData.id || null,
    });

    // Update submission as finalized
    const table = checklistType === "hail_assessment" ? "commercial_hail_assessments" : "production_checklist_submissions";
    await adminClient.from(table).update({
      report_finalized: true,
      report_finalized_at: new Date().toISOString(),
    }).eq("id", submissionId);

    return new Response(JSON.stringify({ success: true, messageId: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-checklist-report error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
