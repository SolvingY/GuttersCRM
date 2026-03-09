import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hail assessment section labels (mirrors client-side data)
const HAIL_SECTION_MAP: Record<string, { title: string; items: Record<string, string> }> = {
  "section-1": {
    title: "Roof Access & Safety",
    items: {
      "s1-ladder-door": "Ladder/door access is secure and stable",
      "s1-walking-surface": "Walking surface is safe",
      "s1-skylights-decking": "Skylights, weak decking, or fall hazards identified",
    },
  },
  "section-2": {
    title: "Roof Overview",
    items: {
      "s2-identify-system": "Identify roof system type",
      "s2-overview-zones": "Overview photos of each roof zone/section",
      "s2-storm-indicators": "Storm indicators visible",
      "s2-corners": "Each corner of roof documented",
      "s2-midpoints": "Midpoints of each side documented",
      "s2-high-point": "High point / ridge line documented",
      "s2-ground-level": "Ground-level perspective",
      "s2-oblique-angles": "Oblique angle shots",
    },
  },
  "section-3": {
    title: "Membrane Roof (TPO / PVC / EPDM)",
    items: {
      "s3-impact-marks": "Impact marks or fractures on membrane",
      "s3-cracks-splits": "Cracks or splits in membrane",
      "s3-punctures": "Punctures or fractures through membrane",
      "s3-seam-separation": "Seam separation or lifted seams",
      "s3-equipment-damage": "Equipment surroundings damage patterns",
      "s3-coverage": "Corner, ridge, midplane coverage documented",
    },
  },
  "section-4": {
    title: "Modified Bitumen / BUR",
    items: {
      "s4-granule-displacement": "Granule displacement or loss",
      "s4-exposed-asphalt": "Exposed asphalt or bitumen",
      "s4-fractures-splits": "Fractures or splits in cap sheet",
      "s4-bruising": "Bruising or soft spots",
      "s4-coverage": "Corner, ridge, midplane coverage documented",
    },
  },
  "section-5": {
    title: "Metal Roof",
    items: {
      "s5-hail-dents": "Hail dents on metal panels",
      "s5-chalked-dent": "Chalked dent documentation",
      "s5-panel-seams": "Panel seam integrity check",
      "s5-fasteners-rib": "Fastener and rib deformation",
      "s5-probe-card": "Probe or card test on standing seams",
      "s5-coverage": "Corner, ridge, midplane coverage documented",
    },
  },
  "section-6": {
    title: "Roof Penetrations & Equipment",
    items: {
      "s6-hvac": "HVAC units inspected",
      "s6-pipe-boots": "Pipe boots and flashings inspected",
      "s6-vents-exhaust": "Vents and exhaust fans inspected",
      "s6-skylights": "Skylights inspected",
      "s6-spatter": "Paint spatter or oxidation on metals",
    },
  },
  "section-7": {
    title: "Other Metal Components",
    items: {
      "s7-copings": "Copings inspected",
      "s7-edge-metal": "Edge metal and drip edge inspected",
      "s7-gutters-downspouts": "Gutters and downspouts inspected",
    },
  },
  "section-8": {
    title: "Interior Quick Check",
    items: {
      "s8-ceiling-tiles": "Water-stained ceiling tiles",
      "s8-drywall-paint": "Stained drywall or paint bubbling",
      "s8-active-leaks": "Active leaks or dripping",
    },
  },
  "section-9": {
    title: "Correlate Interior Areas with Roof",
    items: {
      "s9-roof-above-stains": "Roof area above interior stains identified",
      "s9-seams-penetrations": "Seams and penetrations inspected",
      "s9-hail-damage-doc": "Hail damage in correlated area documented",
    },
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildChecklistItemsHtml(
  checked: Record<string, boolean>,
  labelMap: Record<string, string>,
  sectionTitle?: string
): string {
  const entries = Object.entries(checked);
  if (entries.length === 0) return "";

  const rows = entries
    .map(([key, val]) => {
      const label = labelMap[key] || key;
      const icon = val ? "✅" : "⬜";
      return `<tr><td style="padding:3px 8px;font-size:13px;color:#374151;">${icon} ${escapeHtml(label)}</td></tr>`;
    })
    .join("");

  const header = sectionTitle
    ? `<tr><td style="padding:8px 8px 4px;font-size:13px;font-weight:700;color:#1a1a1a;">${escapeHtml(sectionTitle)}</td></tr>`
    : "";

  return header + rows;
}

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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch submission
    let submission: any;
    let photoPaths: string[] = [];
    const photoStorageBucket = "hail-assessment-photos";
    let itemLabelMap: Record<string, string> = {};
    let sectionGroups: { title: string; items: Record<string, boolean> }[] = [];

    if (checklistType === "hail_assessment") {
      const { data, error } = await adminClient
        .from("commercial_hail_assessments")
        .select("*")
        .eq("id", submissionId)
        .single();
      if (error || !data) throw new Error("Assessment not found");
      submission = data;
      photoPaths = Array.isArray(data.photo_paths) ? (data.photo_paths as string[]) : [];

      // Build section-grouped items for hail assessment
      const checked = (data.form_data as any)?.checked || {};
      for (const [sectionId, section] of Object.entries(HAIL_SECTION_MAP)) {
        const sectionItems: Record<string, boolean> = {};
        for (const itemId of Object.keys(section.items)) {
          if (itemId in checked) {
            sectionItems[itemId] = !!checked[itemId];
          }
        }
        if (Object.keys(sectionItems).length > 0) {
          sectionGroups.push({ title: section.title, items: sectionItems });
        }
      }
      // Build flat label map
      for (const section of Object.values(HAIL_SECTION_MAP)) {
        Object.assign(itemLabelMap, section.items);
      }
    } else if (checklistType === "production_checklist") {
      const { data, error } = await adminClient
        .from("production_checklist_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();
      if (error || !data) throw new Error("Checklist submission not found");
      submission = data;

      // Fetch checklist template for label resolution
      if (data.checklist_id) {
        const { data: tmpl } = await adminClient
          .from("production_checklists")
          .select("title, checklist_items")
          .eq("id", data.checklist_id)
          .single();
        if (tmpl?.checklist_items && Array.isArray(tmpl.checklist_items)) {
          for (const item of tmpl.checklist_items as any[]) {
            if (item.id && item.label) itemLabelMap[item.id] = item.label;
          }
        }
        if (tmpl?.title) {
          submission.checklist_title = tmpl.title;
        }
      }

      // Build single group for production checklists
      const responses = (data.responses as Record<string, boolean>) || {};
      if (Object.keys(responses).length > 0) {
        sectionGroups.push({
          title: submission.checklist_title || "Checklist Items",
          items: responses,
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Invalid checklistType" }), { status: 400, headers: corsHeaders });
    }

    // Generate signed photo URLs (up to 10)
    const photoUrls: string[] = [];
    const photosToShow = photoPaths.slice(0, 10);
    for (const path of photosToShow) {
      const { data: signedData } = await adminClient.storage
        .from(photoStorageBucket)
        .createSignedUrl(path, 3600);
      if (signedData?.signedUrl) photoUrls.push(signedData.signedUrl);
    }

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

    // Result badge
    const resultLabels: Record<string, string> = {
      no_damage: "No Damage",
      possible_damage: "Possible Damage",
      confirmed_damage: "Confirmed Damage",
    };
    const resultLabel = submission.result ? (resultLabels[submission.result] || submission.result) : null;
    const resultColor = submission.result === "no_damage" ? "#16a34a" : submission.result === "possible_damage" ? "#f59e0b" : submission.result === "confirmed_damage" ? "#dc2626" : "#6b7280";

    // Format dates
    const inspectionDate = submission.inspection_date
      ? new Date(submission.inspection_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "N/A";
    const submittedDate = (submission.saved_at || submission.completed_at || submission.created_at)
      ? new Date(submission.saved_at || submission.completed_at || submission.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "N/A";

    const reportTitle = checklistType === "hail_assessment"
      ? "Commercial Hail Assessment Report"
      : "Production Checklist Report";

    // Insert log first so we have the ID for the email link
    const { data: logData } = await adminClient.from("report_email_log").insert({
      checklist_type: checklistType,
      submission_id: submissionId,
      sent_by: userId,
      recipients,
      resend_message_id: null,
    }).select("id").single();

    const logId = logData?.id || "";
    const dashboardUrl = `https://nextgenroofing.lovable.app/admin/sent-reports?id=${logId}`;

    // Build checklist items HTML
    let checklistHtml = "";
    for (const group of sectionGroups) {
      checklistHtml += buildChecklistItemsHtml(group.items, itemLabelMap, group.title);
    }

    // Build photo thumbnails HTML
    let photoHtml = "";
    if (photoUrls.length > 0) {
      const thumbs = photoUrls
        .map((url) => `<td style="padding:4px;"><img src="${url}" width="120" height="90" style="border-radius:6px;object-fit:cover;display:block;" /></td>`)
        .join("");
      photoHtml = `
      <tr>
        <td style="padding:0 32px 16px;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;">📷 Photos (${photoPaths.length} total)</p>
          <table cellpadding="0" cellspacing="0"><tr>${thumbs}</tr></table>
          ${photoPaths.length > 10 ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">+ ${photoPaths.length - 10} more photos available in the dashboard</p>` : ""}
        </td>
      </tr>`;
    }

    // Property name for production checklists
    const propertyName = submission.property_name || submission.job_address || "Untitled";

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
        <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">${escapeHtml(propertyName)}</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
          ${submission.address ? `<tr><td style="padding:4px 0;color:#6b7280;width:120px;">Address</td><td style="padding:4px 0;">${escapeHtml(submission.address)}</td></tr>` : ""}
          ${submission.job_address ? `<tr><td style="padding:4px 0;color:#6b7280;width:120px;">Job Address</td><td style="padding:4px 0;">${escapeHtml(submission.job_address)}</td></tr>` : ""}
          ${submission.homeowner_name ? `<tr><td style="padding:4px 0;color:#6b7280;">Homeowner</td><td style="padding:4px 0;">${escapeHtml(submission.homeowner_name)}</td></tr>` : ""}
          ${submission.homeowner_phone ? `<tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;">${escapeHtml(submission.homeowner_phone)}</td></tr>` : ""}
          ${submission.homeowner_email ? `<tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;">${escapeHtml(submission.homeowner_email)}</td></tr>` : ""}
          <tr><td style="padding:4px 0;color:#6b7280;">Inspector</td><td style="padding:4px 0;">${escapeHtml(submission.inspector_name || senderName)}</td></tr>
          ${submission.inspection_date ? `<tr><td style="padding:4px 0;color:#6b7280;">Inspection Date</td><td style="padding:4px 0;">${inspectionDate}</td></tr>` : ""}
          <tr><td style="padding:4px 0;color:#6b7280;">Submitted</td><td style="padding:4px 0;">${submittedDate}</td></tr>
        </table>
      </td>
    </tr>

    <!-- Result Badge -->
    ${resultLabel ? `
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

    ${submission.notes ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;">Notes</p>
        <p style="margin:0;font-size:14px;color:#374151;background:#f3f4f6;padding:12px;border-radius:8px;">${escapeHtml(submission.notes)}</p>
      </td>
    </tr>` : ""}

    <!-- Checklist Items -->
    ${checklistHtml ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;">Inspection Checklist</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          ${checklistHtml}
        </table>
      </td>
    </tr>` : ""}

    <!-- Photos -->
    ${photoHtml}

    <!-- Doc Links -->
    ${docLinks.length > 0 ? `
    <tr>
      <td style="padding:0 32px 16px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;">Attached Documents</p>
        ${docLinks.map((link) => `<p style="margin:0 0 4px;"><a href="${escapeHtml(link)}" style="color:#2563eb;font-size:13px;text-decoration:underline;">${escapeHtml(link)}</a></p>`).join("")}
      </td>
    </tr>` : ""}

    <!-- View in Dashboard Button -->
    <tr>
      <td style="padding:8px 32px 24px;text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">View Full Report in Dashboard</a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sent by ${escapeHtml(senderName)} via NGR Dashboard · <a href="https://oknextgen.com" style="color:#9ca3af;">oknextgen.com</a></p>
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
        from: "NGR Reports <reports@oknextgen.com>",
        to: toEmails,
        subject: `${reportTitle}: ${propertyName}`,
        html,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) throw new Error(resendData?.message || "Resend API error");

    // Update log with resend message ID
    if (logId) {
      await adminClient.from("report_email_log").update({
        resend_message_id: resendData.id || null,
      }).eq("id", logId);
    }

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
