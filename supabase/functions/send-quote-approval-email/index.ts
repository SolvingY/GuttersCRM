const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      clientName,
      clientEmail,
      quoteAmount,
      validityDays = 7,
      approvedAt,
      referenceNumber,
      pdfBase64,
      pdfFileName,
    } = await req.json();

    if (!clientEmail || !clientName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approvalDate = approvedAt ? new Date(approvedAt) : new Date();
    const expiryDate = new Date(approvalDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);
    const expiryStr = expiryDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const approvalStr = approvalDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const formattedAmount = quoteAmount
      ? `$${Number(quoteAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "See attached estimate";

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1a1a1a; font-size: 22px; margin: 0;">Next Generation Guttering</h1>
          <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Customer Estimate</p>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p>Dear ${clientName},</p>
        <p>Thank you for choosing Next Generation Guttering. ${pdfBase64 ? "Please find your customer estimate attached to this email." : "Below are the details of your approved quote."}</p>
        <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
          <p style="color: #666; font-size: 13px; margin: 0 0 4px;">Your Quoted Investment</p>
          <p style="font-size: 28px; font-weight: bold; color: #1a1a1a; margin: 0;">${formattedAmount}</p>
          ${referenceNumber ? `<p style="color: #888; font-size: 12px; margin: 8px 0 0;">Reference: ${referenceNumber}</p>` : ""}
        </div>
        <div style="background: #fff8e1; border: 1px solid #ffecb3; border-radius: 6px; padding: 12px; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #6d4c00;">
            ⚠️ This quote is valid for <strong>${validityDays} days</strong> from the date of approval (${approvalStr}).
            After <strong>${expiryStr}</strong>, pricing may be subject to change.
            If you have any questions about your quote validity, please contact your representative directly.
          </p>
        </div>
        <p style="font-size: 13px; color: #666;">If you have any questions, please don't hesitate to reach out.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          Thank you,<br />
          <strong>Next Generation Guttering</strong><br />
          <a href="https://nextgenerationroofing.com" style="color: #888;">nextgenerationroofing.com</a>
        </p>
      </body>
      </html>
    `;

    const emailPayload: Record<string, unknown> = {
      from: "Next Generation Guttering <notifications@oknextgen.com>",
      to: [clientEmail],
      subject: `Your Next Generation Guttering Estimate — ${clientName}`,
      html: htmlBody,
    };

    if (pdfBase64) {
      emailPayload.attachments = [
        {
          filename: pdfFileName || "NGG_Estimate.pdf",
          content: pdfBase64,
        },
      ];
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: "Email send failed", details: result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
