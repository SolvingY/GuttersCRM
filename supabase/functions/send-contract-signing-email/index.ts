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
    const { clientName, clientEmail, signingToken, contractAmount, repName, expiresAt } = await req.json();

    if (!clientEmail || !clientName || !signingToken) {
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

    const APP_URL = Deno.env.get("APP_URL") || "https://www.oknextgen.com";
    const signingUrl = `${APP_URL}/sign/${signingToken}`;

    const formattedAmount = contractAmount
      ? `$${Number(contractAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "See contract";

    const formattedExpiry = expiresAt
      ? new Date(expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "7 days";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #2e7d32; font-size: 14px; margin: 8px 0 0;">Contract Review & Signature</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Your installation contract is ready for your review and signature.</p>
    
    <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Contract Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 4px 0;"><strong>Representative:</strong> ${repName || "Your NGR Representative"}</p>
    </div>

    <p>Please click below to review and sign your contract:</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${signingUrl}" style="display: inline-block; background: #2e7d32; color: #fff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        REVIEW & SIGN CONTRACT
      </a>
    </div>

    <p style="font-size: 13px; color: #666;">This link expires on <strong>${formattedExpiry}</strong>.</p>
    <p style="font-size: 13px; color: #666;">If you have questions before signing, please contact your representative directly.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Guttering<br>
      3 NE 8th St, Oklahoma City, OK 73104<br>
      (405) 724-8092 • www.OKNEXTGEN.com
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
        subject: "Action Required — Please Sign Your Next Generation Guttering Contract",
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
