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
    const {
      leadId,
      clientName,
      address,
      quoteAmount,
      serviceType,
      submittedBy,
      submittedAt,
    } = await req.json();

    if (!leadId || !clientName) {
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

    // Use service role to query admin users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all admin user IDs
    const { data: adminUsers, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError || !adminUsers || adminUsers.length === 0) {
      console.error("No admin users found:", rolesError);
      return new Response(
        JSON.stringify({ error: "No admin users found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get emails for each admin user
    const adminEmails: string[] = [];
    for (const u of adminUsers) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(u.user_id);
      if (data?.user?.email) {
        adminEmails.push(data.user.email);
      }
    }

    if (adminEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No admin emails found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const APP_URL = Deno.env.get("APP_URL") || "https://nextgenroofing.lovable.app";
    const adminUrl = `${APP_URL}/admin/leads/${leadId}`;

    const formattedAmount = quoteAmount
      ? `$${Number(quoteAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "N/A";

    const formattedDate = submittedAt
      ? new Date(submittedAt).toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : new Date().toLocaleString("en-US");

    const serviceLabels: Record<string, string> = {
      commercial: "Commercial Roofing",
      residential: "Residential Roofing",
      gutters: "Gutters & Gutter Protection",
      repair: "Repair Work",
    };
    const serviceLabel = serviceLabels[serviceType] || serviceType || "N/A";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">📋 Quote Pending Approval</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Next Generation Roofing</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 16px;">
      <strong>${submittedBy || "A team member"}</strong> has submitted a quote for approval.
    </p>
    
    <div style="background: #fafafa; padding: 16px; border-radius: 8px; border-left: 4px solid #c91f5e;">
      <p style="margin: 4px 0;"><strong>Customer:</strong> ${clientName}</p>
      <p style="margin: 4px 0;"><strong>Address:</strong> ${address || "N/A"}</p>
      <p style="margin: 4px 0;"><strong>Quote Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 4px 0;"><strong>Service Type:</strong> ${serviceLabel}</p>
      <p style="margin: 4px 0;"><strong>Submitted:</strong> ${formattedDate}</p>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${adminUrl}" style="display: inline-block; background: #c91f5e; color: #fff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        REVIEW QUOTE
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Roofing • Automated Quote Notification
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
        to: adminEmails,
        subject: `📋 Quote Pending Approval — ${clientName}`,
        html,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-quote-pending error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
