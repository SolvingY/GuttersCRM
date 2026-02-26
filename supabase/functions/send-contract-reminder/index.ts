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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Get stale contracts (sent > 48 hours ago, not yet signed)
    const { data: staleContracts, error: queryError } = await supabaseAdmin
      .from("lead_forms")
      .select(`
        id, signing_token, token_expires_at, sent_for_signing_at,
        quote_requests!inner(id, full_name, email, street_address, city, state)
      `)
      .eq("form_type", "contract")
      .eq("status", "sent")
      .lt("sent_for_signing_at", fortyEightHoursAgo);

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staleContracts || staleContracts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No stale contracts found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const APP_URL = Deno.env.get("APP_URL") || "https://www.oknextgen.com";
    let sentCount = 0;

    for (const contract of staleContracts) {
      const lead = contract.quote_requests as any;
      if (!lead?.email || !contract.signing_token) continue;

      // Check if token is expired, if so regenerate
      let signingToken = contract.signing_token;
      let tokenExpiresAt = contract.token_expires_at;

      if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        const newToken = crypto.randomUUID();

        await supabaseAdmin
          .from("lead_forms")
          .update({
            signing_token: newToken,
            token_expires_at: newExpiry.toISOString(),
          })
          .eq("id", contract.id);

        signingToken = newToken;
        tokenExpiresAt = newExpiry.toISOString();
      }

      const signingUrl = `${APP_URL}/sign/${signingToken}`;
      const formattedExpiry = tokenExpiresAt
        ? new Date(tokenExpiresAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "7 days";

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #2e7d32; font-size: 14px; margin: 8px 0 0;">Contract Reminder</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${lead.full_name},</p>
    <p>Just a friendly reminder that your installation contract is still waiting for your signature.</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${signingUrl}" style="display: inline-block; background: #2e7d32; color: #fff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        REVIEW & SIGN CONTRACT
      </a>
    </div>

    <p style="font-size: 13px; color: #666;">This link expires on <strong>${formattedExpiry}</strong>.</p>
    <p style="font-size: 13px; color: #666;">Questions? Contact your representative directly.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Guttering<br>
      3 NE 8th St, Oklahoma City, OK 73104<br>
      (405) 724-8092 • www.OKNEXTGEN.com
    </p>
  </div>
</body>
</html>`;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Next Generation Guttering <notifications@oknextgen.com>",
            to: [lead.email],
            subject:
              "Reminder — Your Next Generation Guttering Contract is Ready to Sign",
            html,
          }),
        });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send reminder to ${lead.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: staleContracts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-contract-reminder error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
