import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RECIPIENTS = [
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, clientPhone, serviceType, referenceNumber, streetAddress, city, state, zipCode, leadId } = await req.json();

    if (!clientName || !referenceNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceLabel = serviceLabels[serviceType] || serviceType;
    const adminUrl = leadId
      ? `https://nextgenroofing.lovable.app/admin/leads/${leadId}`
      : "https://nextgenroofing.lovable.app/admin/leads";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">New Internet Lead</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Next Generation Roofing</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 16px;">A new internet lead has been submitted:</p>
    
    <div style="background: #fafafa; padding: 16px; border-radius: 8px; border-left: 4px solid #c91f5e;">
      <p style="margin: 4px 0;"><strong>Name:</strong> ${clientName}</p>
      <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceLabel}</p>
      <p style="margin: 4px 0;"><strong>Phone:</strong> ${clientPhone || "N/A"}</p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${clientEmail || "N/A"}</p>
      <p style="margin: 4px 0;"><strong>Address:</strong> ${streetAddress || ""}, ${city || ""}, ${state || "OK"} ${zipCode || ""}</p>
      <p style="margin: 4px 0;"><strong>Reference #:</strong> ${referenceNumber}</p>
    </div>
    
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
        to: RECIPIENTS,
        subject: `🏠 New Internet Lead: ${clientName} — ${serviceLabel}`,
        html,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
