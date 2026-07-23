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
    const { clientName, clientEmail, contractAmount, repName, signedDate } = await req.json();

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

    const formattedAmount = contractAmount
      ? `$${Number(contractAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "See contract";

    const formattedDate = signedDate
      ? new Date(signedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #2e7d32; font-size: 14px; margin: 8px 0 0;">Contract Confirmed ✅</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Thank you for choosing Next Generation Guttering! This email confirms that your installation contract has been signed and is now on file.</p>
    
    <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
      <p style="margin: 4px 0;"><strong>Contract Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 4px 0;"><strong>Representative:</strong> ${repName || "Your NGR Representative"}</p>
      <p style="margin: 4px 0;"><strong>Date Signed:</strong> ${formattedDate}</p>
    </div>

    <p><strong>What happens next?</strong></p>
    <ul style="color: #555; font-size: 14px;">
      <li>Our team will reach out to schedule your installation.</li>
      <li>You'll receive a confirmation once your install date is set.</li>
      <li>If you have any questions, don't hesitate to contact us.</li>
    </ul>

    <p style="font-size: 13px; color: #666;">If you have any questions about your contract, please contact your representative directly or call us at (405) 724-8092.</p>

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
        subject: "Your Contract with Next Generation Guttering is Confirmed ✅",
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
