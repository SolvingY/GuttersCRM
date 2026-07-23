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
    const { formId, leadId, customerName, signedAt } = await req.json();

    if (!leadId || !customerName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up lead and assigned rep
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("quote_requests")
      .select("full_name, reference_number, street_address, city, state, zip_code, assigned_to")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get rep email from auth.users via profiles
    let repEmail = "";
    if (lead.assigned_to) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(lead.assigned_to);
      repEmail = user?.email || "";
    }

    // Update lead status to scheduled
    await supabaseAdmin
      .from("quote_requests")
      .update({ status: "scheduled" })
      .eq("id", leadId);

    // Log activity
    await supabaseAdmin
      .from("lead_activity_log")
      .insert({
        lead_id: leadId,
        activity_type: "contract_signed",
        content: `Contract signed by ${customerName}`,
      });

    // Auto-file signed contract on the lead card
    const uploadedBy = lead.assigned_to || (formId ? undefined : undefined);
    if (uploadedBy) {
      await supabaseAdmin
        .from("lead_files")
        .insert({
          lead_id: leadId,
          file_name: `Signed Contract - ${customerName}`,
          file_type: "Contract",
          file_url: `form://contract/${formId}`,
          uploaded_by: uploadedBy,
        });
    }

    // Send notification email to rep
    if (repEmail) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const APP_URL = Deno.env.get("APP_URL") || "https://www.oknextgen.com";
        const dashboardUrl = `${APP_URL}/dashboard/leads/${leadId}`;
        const formattedDate = new Date(signedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Next Generation Guttering</h1>
    <p style="color: #2e7d32; font-size: 14px; margin: 8px 0 0;">Contract Signed ✅</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p><strong>${customerName}</strong> has signed their installation contract.</p>

    <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
      <p style="margin: 4px 0;"><strong>Signed:</strong> ${formattedDate}</p>
      ${lead.reference_number ? `<p style="margin: 4px 0;"><strong>Lead:</strong> ${lead.reference_number}</p>` : ""}
      <p style="margin: 4px 0;"><strong>Customer:</strong> ${lead.full_name}</p>
      <p style="margin: 4px 0;"><strong>Address:</strong> ${lead.street_address}, ${lead.city}, ${lead.state} ${lead.zip_code}</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #2e7d32; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">VIEW LEAD</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Guttering • www.OKNEXTGEN.com
    </p>
  </div>
</body>
</html>`;

        const repRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Next Generation Guttering <notifications@oknextgen.com>",
            to: [repEmail],
            subject: `✅ Contract Signed — ${customerName}`,
            html,
          }),
        });
        if (!repRes.ok) {
          // Status update already succeeded; the rep notification is best-effort. Log, don't fail.
          console.error("Rep contract-signed email failed:", repRes.status, await repRes.text());
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
