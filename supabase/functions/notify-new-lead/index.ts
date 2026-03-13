import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_RECIPIENTS = [
  "j.whitton@oknextgen.com",
  "k.jameson@oknextgen.com",
  "a.Whisman@oknextgen.com",
  "adam@grateful-services.com",
];

const serviceLabels: Record<string, string> = {
  commercial: "Commercial Roofing",
  residential: "Residential Roofing",
  gutters: "Gutters & Gutter Protection",
  repair: "Repair Work",
};

const formFieldLabels: Record<string, string> = {
  timeline: "Timeline",
  urgency: "Urgency",
  propertyType: "Property Type",
  roofType: "Roof Type",
  roofAge: "Roof Age",
  homeAge: "Home Age",
  stories: "Number of Stories",
  squareFootage: "Home Size (sq ft)",
  knownIssues: "Known Issues",
  issueDescription: "Issue Description",
  repairTarget: "Repair Target",
  gutterMaterial: "Gutter Material",
  gutterLength: "Gutter Length",
  hasInsurance: "Insurance Claim",
  insuranceCompany: "Insurance Company",
  jobType: "Job Type",
  hasMortgage: "Has Mortgage",
  maintenanceHistory: "Maintenance History",
  additionalNotes: "Additional Notes",
  description: "Description",
};

function renderDetailRows(formData: Record<string, any>, bestContactTime?: string[], referralSource?: string): string {
  const rows: string[] = [];
  for (const [key, label] of Object.entries(formFieldLabels)) {
    const val = formData[key];
    if (val !== undefined && val !== null && val !== "") {
      const display = Array.isArray(val) ? val.join(", ") : String(val);
      rows.push(`<p style="margin: 4px 0;"><strong>${label}:</strong> ${display}</p>`);
    }
  }
  if (bestContactTime && bestContactTime.length > 0) {
    rows.push(`<p style="margin: 4px 0;"><strong>Best Contact Time:</strong> ${bestContactTime.join(", ")}</p>`);
  }
  if (referralSource) {
    rows.push(`<p style="margin: 4px 0;"><strong>Referral Source:</strong> ${referralSource}</p>`);
  }
  if (rows.length === 0) return "";
  return `
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; border-left: 4px solid #555; margin-top: 16px;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #333;">Quote Details</p>
      ${rows.join("\n      ")}
    </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, clientPhone, serviceType, referenceNumber, streetAddress, city, state, zipCode, leadId, formData, bestContactTime, referralSource, leadSource, canvasserName } = await req.json();

    if (!clientName || !referenceNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isCanvasserLead = leadSource === "canvasser";
    const notificationType = isCanvasserLead ? "new_canvasser_lead" : "new_lead";

    const { data: routes } = await supabaseAdmin
      .from("notification_routing")
      .select("email")
      .eq("notification_type", notificationType)
      .eq("is_active", true);

    // Fall back to new_lead routes if no canvasser-specific routes exist
    let recipientEmails: string[];
    if (routes && routes.length > 0) {
      recipientEmails = routes.map((r: any) => r.email);
    } else if (isCanvasserLead) {
      const { data: fallbackRoutes } = await supabaseAdmin
        .from("notification_routing")
        .select("email")
        .eq("notification_type", "new_lead")
        .eq("is_active", true);
      recipientEmails = fallbackRoutes && fallbackRoutes.length > 0
        ? fallbackRoutes.map((r: any) => r.email)
        : FALLBACK_RECIPIENTS;
    } else {
      recipientEmails = FALLBACK_RECIPIENTS;
    }

    const serviceLabel = serviceLabels[serviceType] || serviceType;
    const adminUrl = leadId
      ? `https://nextgenroofing.lovable.app/admin/leads/${leadId}`
      : "https://nextgenroofing.lovable.app/admin/leads";

    const detailsHtml = renderDetailRows(formData || {}, bestContactTime, referralSource);

    const leadTypeLabel = isCanvasserLead ? "New Canvasser Lead" : "New Internet Lead";
    const canvasserLine = isCanvasserLead && canvasserName
      ? `<p style="margin: 4px 0;"><strong>Set By:</strong> ${canvasserName}</p>`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">${leadTypeLabel}</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Next Generation Roofing</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 16px;">A new ${isCanvasserLead ? "canvasser" : "internet"} lead has been submitted:</p>
    <div style="background: #fafafa; padding: 16px; border-radius: 8px; border-left: 4px solid ${isCanvasserLead ? "#7c3aed" : "#c91f5e"};">
      <p style="margin: 4px 0;"><strong>Name:</strong> ${clientName}</p>
      <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceLabel}</p>
      <p style="margin: 4px 0;"><strong>Phone:</strong> ${clientPhone || "N/A"}</p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${clientEmail || "N/A"}</p>
      <p style="margin: 4px 0;"><strong>Address:</strong> ${streetAddress || ""}, ${city || ""}, ${state || "OK"} ${zipCode || ""}</p>
      <p style="margin: 4px 0;"><strong>Reference #:</strong> ${referenceNumber}</p>
      ${canvasserLine}
    </div>
    ${detailsHtml}
    <div style="text-align: center; margin: 24px 0;">
      <a href="${adminUrl}" style="display: inline-block; background: #c91f5e; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">View in Admin Dashboard</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Roofing • Automated Lead Notification
    </p>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Next Generation Roofing <notifications@oknextgen.com>",
        to: recipientEmails,
        subject: isCanvasserLead
          ? `🏠 New Canvasser Lead: ${clientName} — ${serviceLabel}`
          : `🏠 New Internet Lead: ${clientName} — ${serviceLabel}`,
        html,
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
