import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { leadId, customerName, quoteAmount, repName, lostReason, leadSource, wasDamaged } = await req.json();

    if (!leadId || !customerName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all admin user IDs (admins/managers only for lost notifications)
    const { data: adminUsers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const recipientEmails: string[] = [];
    for (const u of (adminUsers || [])) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(u.user_id);
      if (data?.user?.email) recipientEmails.push(data.user.email);
    }

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const APP_URL = Deno.env.get("APP_URL") || "https://nextgenroofing.lovable.app";
    const leadUrl = `${APP_URL}/admin/leads/${leadId}`;

    const formattedAmount = quoteAmount
      ? `$${Number(quoteAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "N/A";

    const reason = lostReason || "Not specified";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">❌ Deal Lost</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Next Generation Roofing</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 16px;">
      A deal has been marked as lost.
    </p>
    
    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
      <p style="margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin: 4px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 4px 0;"><strong>Rep:</strong> ${repName || "N/A"}</p>
      <p style="margin: 4px 0;"><strong>Loss Reason:</strong> ${reason}</p>
      <p style="margin: 4px 0;"><strong>Damage Found:</strong> ${wasDamaged === true ? "Yes ✅" : wasDamaged === false ? "No ❌" : "Not specified"}</p>
      <p style="margin: 4px 0;"><strong>Lead Source:</strong> ${leadSource || "N/A"}</p>
    </div>

    <p style="font-size: 14px; color: #666; margin: 16px 0; font-style: italic;">
      This may be a save opportunity if the reason is price or timing.
    </p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${leadUrl}" style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        VIEW LEAD
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Roofing • Deal Lost Notification
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
        subject: `❌ Deal Lost — ${customerName} — ${formattedAmount}`,
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
    console.error("notify-deal-lost error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
