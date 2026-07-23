import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      clientName,
      clientEmail,
      amount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      paymentRef,
      totalPaid,
      balanceDue,
      quoteAmount,
    } = await req.json();

    if (!clientEmail || !clientName || amount === undefined || amount === null) {
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

    const formattedDate = paymentDate
      ? new Date(paymentDate + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const paidInFull = typeof balanceDue === "number" && balanceDue <= 0;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #2e7d32; font-size: 14px; margin: 8px 0 0;">Payment Receipt</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Thank you — we've received your payment. Here is your receipt${referenceNumber ? ` for reference #${referenceNumber}` : ""}.</p>

    <div style="background: #f8f8f8; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Payment Received</p>
      <p style="margin: 0; font-size: 36px; font-weight: bold; color: #2e7d32;">${formatCurrency(Number(amount))}</p>
    </div>

    <div style="background: #fafafa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
      <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
      ${paymentMethod ? `<p style="margin: 4px 0;"><strong>Method:</strong> ${paymentMethod}</p>` : ""}
      ${paymentRef ? `<p style="margin: 4px 0;"><strong>Payment Ref:</strong> ${paymentRef}</p>` : ""}
      ${typeof quoteAmount === "number" ? `<p style="margin: 4px 0;"><strong>Contract Total:</strong> ${formatCurrency(quoteAmount)}</p>` : ""}
      ${typeof totalPaid === "number" ? `<p style="margin: 4px 0;"><strong>Total Paid to Date:</strong> ${formatCurrency(totalPaid)}</p>` : ""}
      ${typeof balanceDue === "number" ? `<p style="margin: 4px 0;"><strong>Balance Due:</strong> ${formatCurrency(Math.max(0, balanceDue))}</p>` : ""}
    </div>

    ${paidInFull
      ? `<div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
           <p style="margin: 0; font-weight: bold; color: #2e7d32;">✓ Your balance is paid in full. Thank you!</p>
         </div>`
      : ""}

    <p style="font-size: 13px; color: #666;">If you have any questions about this receipt, please contact us.</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:4057248092" style="display: inline-block; background: #2e7d32; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Call Us: (405) 724-8092</a>
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
        subject: paidInFull
          ? "Payment Receipt — Paid in Full | Next Generation Guttering"
          : `Payment Receipt — ${formatCurrency(Number(amount))} | Next Generation Guttering`,
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
