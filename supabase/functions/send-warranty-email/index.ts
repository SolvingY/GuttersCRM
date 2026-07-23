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
    const { clientName, clientEmail, quoteAmount, referenceNumber, installDate, completedAt, protectionProduct } = await req.json();

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

    const rebateValue = quoteAmount ? (Number(quoteAmount) * 0.10).toFixed(2) : "0.00";

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "N/A";
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Protection warranty section based on product
    let protectionWarrantyHtml = "";
    const normalizedProduct = (protectionProduct || "").toLowerCase().trim();
    
    if (normalizedProduct.includes("hydro flow") || normalizedProduct.includes("pro flo")) {
      protectionWarrantyHtml = `
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <p style="margin: 0; color: #2e7d32;">✓ <strong>45-Year Manufacturer Warranty on Gutter Protection</strong></p>
        <p style="margin: 4px 0 0 20px; font-size: 13px; color: #666;">Check full manufacturer documentation for complete terms.</p>
      </div>`;
    } else if (normalizedProduct.includes("gutter rx")) {
      protectionWarrantyHtml = `
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <p style="margin: 0; color: #2e7d32;">✓ <strong>10-Year Manufacturer Warranty on Gutter Protection</strong></p>
        <p style="margin: 4px 0 0 20px; font-size: 13px; color: #666;">Check full manufacturer documentation for complete terms.</p>
      </div>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #2e7d32; font-size: 14px; margin: 8px 0 0;">Warranty Documents</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${clientName},</p>
    <p>Thank you for choosing Next Generation Guttering! Your installation is now complete and your warranties are active.</p>
    
    <h3 style="color: #000; border-bottom: 2px solid #2e7d32; padding-bottom: 8px;">YOUR WARRANTIES INCLUDE:</h3>
    
    <div style="margin: 16px 0;">
      <h4 style="color: #333; margin: 16px 0 8px;">GUTTER WARRANTIES:</h4>
      
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <p style="margin: 0; color: #2e7d32;">✓ <strong>Lifetime Leak-Free Guarantee</strong></p>
        <p style="margin: 4px 0 0 20px; font-size: 13px; color: #666;">Valid with yearly scheduled inspection</p>
      </div>
      
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <p style="margin: 0; color: #2e7d32;">✓ <strong>25-Year Baked-On Paint Warranty</strong></p>
        <p style="margin: 4px 0 0 20px; font-size: 13px; color: #666;">Applies to gutters and downspouts</p>
      </div>
      
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <p style="margin: 0; color: #2e7d32;">✓ <strong>10% Rebate Toward Future Roof Replacement</strong></p>
        <p style="margin: 4px 0 0 20px; font-size: 13px; color: #666;">Your rebate value: $${rebateValue}</p>
      </div>

      ${protectionWarrantyHtml}
    </div>

    <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
      <p style="margin: 0; font-weight: bold; color: #1b5e20;">WHAT ACTIVATES YOUR LIFETIME GUARANTEE</p>
      <p style="margin: 8px 0 0; color: #2e7d32; font-size: 14px;">
        Your Lifetime Leak-Free Guarantee remains active with a yearly scheduled inspection.
        Contact us annually to schedule your free inspection.
      </p>
    </div>

    <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 20px 0;">
      ${referenceNumber ? `<p style="margin: 4px 0;"><strong>Job Reference:</strong> ${referenceNumber}</p>` : ""}
      ${installDate ? `<p style="margin: 4px 0;"><strong>Installation Date:</strong> ${formatDate(installDate)}</p>` : ""}
      ${completedAt ? `<p style="margin: 4px 0;"><strong>Completed:</strong> ${formatDate(completedAt)}</p>` : ""}
    </div>

    <p>Thank you for your business!</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:4057248092" style="display: inline-block; background: #2e7d32; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Schedule Inspection: (405) 724-8092</a>
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
        subject: "Your Next Generation Guttering Warranty Documents",
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
