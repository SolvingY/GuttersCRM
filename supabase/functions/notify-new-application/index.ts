import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_RECIPIENTS = [
  "m.fowler@oknextgen.com",
  "j.whitton@oknextgen.com",
  "k.jameson@oknextgen.com",
];

function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char] || char));
}

function getAlignmentColor(category: string): string {
  switch (category) {
    case 'Strong Alignment': return '#16a34a';
    case 'Good Alignment': return '#2563eb';
    case 'Moderate Alignment': return '#d97706';
    default: return '#dc2626';
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      fullName, email, phone, desiredPosition,
      yearsExperience, dnaScore, alignmentCategory,
    } = await req.json();

    console.log(`New application notification for: ${fullName}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: routes } = await supabaseAdmin
      .from("notification_routing")
      .select("email")
      .eq("notification_type", "new_application")
      .eq("is_active", true);

    const recipientEmails = routes && routes.length > 0
      ? routes.map((r: any) => r.email)
      : FALLBACK_RECIPIENTS;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminUrl = "https://nextgenroofing.lovable.app/admin/future-team-mates";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #c41e3a; margin: 0;">🚀 New Job Application</h1>
    <p style="color: #666; margin: 8px 0 0 0;">A new candidate has applied to join the team</p>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="margin: 0 0 12px 0; color: #333;">Applicant Details</h3>
    <p style="margin: 6px 0; color: #555;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
    <p style="margin: 6px 0; color: #555;"><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p style="margin: 6px 0; color: #555;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p style="margin: 6px 0; color: #555;"><strong>Desired Position:</strong> ${escapeHtml(desiredPosition)}</p>
    <p style="margin: 6px 0; color: #555;"><strong>Experience:</strong> ${escapeHtml(yearsExperience)}</p>
  </div>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
    <h3 style="margin: 0 0 12px 0; color: #333;">DNA Assessment</h3>
    <p style="margin: 6px 0; color: #555;"><strong>Score:</strong> ${dnaScore ?? 'N/A'}/100</p>
    <p style="margin: 6px 0;">
      <strong>Alignment:</strong>
      <span style="color: ${getAlignmentColor(alignmentCategory || '')}; font-weight: 600;">
        ${escapeHtml(alignmentCategory || 'N/A')}
      </span>
    </p>
  </div>
  <div style="text-align: center;">
    <a href="${adminUrl}" style="display: inline-block; background: #c41e3a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      View in Admin Dashboard
    </a>
  </div>
  <p style="text-align: center; font-size: 12px; color: #999; margin-top: 32px;">
    Next Generation Roofing - Automated Application Notification
  </p>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Next Gen Roofing <notifications@oknextgen.com>",
        to: recipientEmails,
        subject: `📋 New Application: ${fullName} — ${desiredPosition}`,
        html: emailHtml,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Failed to send notification email:", result);
      return new Response(JSON.stringify({ error: result }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Notification emails sent successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-application:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
