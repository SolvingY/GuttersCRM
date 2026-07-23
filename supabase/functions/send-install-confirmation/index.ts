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
    const { clientName, clientEmail, installDate, timeWindow, address, installNotes, referenceNumber } = await req.json();

    if (!clientEmail || !clientName || !installDate) {
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

    const timeWindowLabels: Record<string, string> = {
      morning: "Morning (8:00 AM - 12:00 PM)",
      afternoon: "Afternoon (12:00 PM - 5:00 PM)",
      all_day: "All Day (8:00 AM - 5:00 PM)",
    };

    const formattedDate = new Date(installDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const timeLabel = timeWindowLabels[timeWindow] || timeWindow;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Installation Confirmation</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Great news! Your gutter installation has been scheduled.</p>
    
    <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${timeLabel}</p>
      <p style="margin: 8px 0;"><strong>📍 Address:</strong> ${address}</p>
      ${installNotes ? `<p style="margin: 8px 0;"><strong>📝 Notes:</strong> ${installNotes}</p>` : ""}
      ${referenceNumber ? `<p style="margin: 8px 0;"><strong>Reference:</strong> ${referenceNumber}</p>` : ""}
    </div>

    <div style="background: #fff3cd; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ HOMEOWNER PREPARATION REMINDER</p>
      <p style="margin: 8px 0 0; color: #856404; font-size: 14px;">
        Please ensure all items obstructing gutter and downspout access are removed before your installation date.
        This includes outdoor furniture, vehicles, planters, and decorative items near the roofline.
      </p>
    </div>

    <p>If you need to reschedule, please contact your representative.</p>
    
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
        subject: "Your Next Generation Guttering Installation is Scheduled",
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
