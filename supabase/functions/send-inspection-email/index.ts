import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const {
      clientName,
      clientEmail,
      address,
      appointmentDate,
      appointmentTime,
      inspectionData,
      serviceInterest,
    } = await req.json();

    if (!clientEmail || !clientName) {
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

    const isRoofingOnly = ["roofing", "residential", "commercial"].includes(serviceInterest);

    // Build inspection results HTML
    let inspectionHtml = "";
    if (inspectionData) {
      const { conditions, perimeterChecks, insideChecks, preExisting, safetyConcerns } = inspectionData;

      // Gutter conditions (skip for roofing-only)
      if (!isRoofingOnly && conditions && Object.keys(conditions).length > 0) {
        const activeConditions = Object.entries(conditions).filter(([_, v]) => v).map(([k]) => k);
        if (activeConditions.length > 0) {
          inspectionHtml += `<h3 style="margin: 16px 0 8px; font-size: 14px; color: #333;">Gutter Conditions Found:</h3><ul style="margin: 0; padding-left: 20px;">`;
          activeConditions.forEach((c) => {
            inspectionHtml += `<li style="margin: 4px 0; font-size: 13px;">${c.replace(/([A-Z])/g, " $1").trim()}</li>`;
          });
          inspectionHtml += `</ul>`;
        }
      }

      // Perimeter
      if (perimeterChecks && Object.keys(perimeterChecks).length > 0) {
        const found = Object.entries(perimeterChecks).filter(([_, v]) => v === true).map(([k]) => k);
        if (found.length > 0) {
          inspectionHtml += `<h3 style="margin: 16px 0 8px; font-size: 14px; color: #333;">Perimeter Issues Found:</h3><ul style="margin: 0; padding-left: 20px;">`;
          found.forEach((item) => {
            inspectionHtml += `<li style="margin: 4px 0; font-size: 13px;">⚠️ ${item}</li>`;
          });
          inspectionHtml += `</ul>`;
        }
      }

      // Inside gutters (skip for roofing-only)
      if (!isRoofingOnly && insideChecks && Object.keys(insideChecks).length > 0) {
        const found = Object.entries(insideChecks).filter(([_, v]) => v === true).map(([k]) => k);
        if (found.length > 0) {
          inspectionHtml += `<h3 style="margin: 16px 0 8px; font-size: 14px; color: #333;">Found Inside Gutters:</h3><ul style="margin: 0; padding-left: 20px;">`;
          found.forEach((item) => {
            inspectionHtml += `<li style="margin: 4px 0; font-size: 13px;">⚠️ ${item}</li>`;
          });
          inspectionHtml += `</ul>`;
        }
      }

      if (preExisting) {
        inspectionHtml += `<p style="margin: 12px 0; font-size: 13px;"><strong>Pre-existing conditions:</strong> ${preExisting}</p>`;
      }
      if (safetyConcerns) {
        inspectionHtml += `<p style="margin: 12px 0; font-size: 13px;"><strong>Safety concerns:</strong> ${safetyConcerns}</p>`;
      }
    }

    // Build appointment HTML
    let appointmentHtml = "";
    if (appointmentDate) {
      const formattedDate = new Date(appointmentDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      appointmentHtml = `
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <p style="margin: 0; font-weight: bold; font-size: 14px;">📅 Your Consultation Appointment</p>
          <p style="margin: 8px 0 0; font-size: 13px;"><strong>Date:</strong> ${formattedDate}</p>
          ${appointmentTime ? `<p style="margin: 4px 0 0; font-size: 13px;"><strong>Time:</strong> ${appointmentTime}</p>` : ""}
          <p style="margin: 4px 0 0; font-size: 13px;"><strong>Location:</strong> ${address}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #666;">• An adult (18+) must be present<br>• 24-hour reschedule notice required</p>
        </div>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Inspection Report</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Thank you for allowing us to inspect your property. Below is a summary of our findings.</p>
    
    <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-size: 13px;"><strong>📍 Property:</strong> ${address}</p>
      <p style="margin: 4px 0 0; font-size: 13px;"><strong>📋 Date:</strong> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>

    ${inspectionHtml || '<p style="font-size: 13px; color: #666;">No specific issues were noted during the inspection.</p>'}

    ${appointmentHtml}

    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; font-size: 14px;">Why Choose Next Gen?</p>
      <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px;">
        <li>Locally owned and operated</li>
        <li>Licensed and insured</li>
        <li>Free estimates and inspections</li>
        <li>Lifetime No-Leak Warranty</li>
        <li>Highest quality materials</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:4057248092" style="display: inline-block; background: #c91f5e; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Call Us: (405) 724-8092</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Guttering • nextgenerationroofing.com
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
        from: "Next Generation Guttering <notifications@oknextgen.com>",
        to: [clientEmail],
        subject: "Your Property Inspection Report — Next Generation Guttering",
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend send failed:", res.status, result);
      return new Response(JSON.stringify({ error: "Email send failed", details: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
