import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const serviceLabels: Record<string, string> = {
  commercial: "Commercial Roofing",
  residential: "Residential Roofing",
  gutters: "Gutters & Gutter Protection",
  repair: "Repair Work",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, serviceType, referenceNumber, quoteAmount } = await req.json();

    if (!clientEmail || !clientName || !referenceNumber) {
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
    const formattedAmount = quoteAmount ? formatCurrency(quoteAmount) : null;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Roofing</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Your Project Quote</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Thank you for choosing Next Generation Roofing. Based on our evaluation of your project, here is your quote:</p>
    
    <div style="background: #f8f8f8; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Quote</p>
      ${formattedAmount 
        ? `<p style="margin: 0; font-size: 36px; font-weight: bold; color: #c91f5e;">${formattedAmount}</p>` 
        : `<p style="margin: 0; font-size: 18px; color: #666;">Contact us for pricing details</p>`}
    </div>

    <div style="background: #fafafa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c91f5e;">
      <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceLabel}</p>
      <p style="margin: 4px 0;"><strong>Reference #:</strong> ${referenceNumber}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    
    <h3 style="color: #000;">What happens next?</h3>
    <ul style="padding-left: 20px;">
      <li>Review this quote at your convenience</li>
      <li>Contact us with any questions or to accept</li>
      <li>We'll schedule your project at a time that works for you</li>
    </ul>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:4057248092" style="display: inline-block; background: #c91f5e; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Call Us: (405) 724-8092</a>
    </div>
    
    <p style="font-size: 13px; color: #666;">This quote is valid for 30 days from the date above. Pricing may change based on material availability and project scope changes.</p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Roofing • Oklahoma's Premier Roofing Team<br>
      Veteran-Operated & Supported • 7-Year Workmanship Guarantee
    </p>
  </div>
</body>
</html>`;

    const subject = formattedAmount 
      ? `Your Quote - ${formattedAmount} | Next Generation Roofing`
      : `Your Quote from Next Generation Roofing - Ref #${referenceNumber}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Next Generation Roofing <invites@oknextgen.com>",
        to: [clientEmail],
        subject,
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

    return new Response(JSON.stringify({ success: true, result, html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
