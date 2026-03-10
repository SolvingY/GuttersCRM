import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ROUTING_MAP: Record<string, { name: string; email: string }> = {
  "Canvassing / Door-to-Door Sales": { name: "Matt Fowler", email: "m.fowler@oknextgen.com" },
  "Outside Sales Representative": { name: "Jonathan Whitton", email: "j.whitton@oknextgen.com" },
  "Roofing Installer / Production Crew": { name: "Jonathan Whitton", email: "j.whitton@oknextgen.com" },
  "Other / General Interest": { name: "Jonathan Whitton", email: "j.whitton@oknextgen.com" },
};

const DEFAULT_ROUTING = { name: "Jonathan Whitton", email: "j.whitton@oknextgen.com" };

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "NGR Notifications <notifications@oknextgen.com>", to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { applicantId, newStage, interviewDateTime } = await req.json();
    if (!applicantId || !newStage) {
      return new Response(JSON.stringify({ error: "Missing applicantId or newStage" }), { status: 400, headers: corsHeaders });
    }

    // Use service role to read applicant data
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: applicant, error: appErr } = await adminClient
      .from("job_applications")
      .select("*")
      .eq("id", applicantId)
      .single();

    if (appErr || !applicant) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404, headers: corsHeaders });
    }

    const routing = ROUTING_MAP[applicant.desired_position] || DEFAULT_ROUTING;

    if (newStage === "contacted") {
      // Send email to applicant (if email exists)
      if (applicant.email) {
        await sendEmail(
          applicant.email,
          "Next Steps — Next Generation Roofing",
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#dc2626;color:white;padding:24px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;font-size:22px;">Next Generation Roofing</h1>
            </div>
            <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
              <p>Hi ${applicant.full_name},</p>
              <p>Thank you for your interest in joining Next Generation Roofing! We've reviewed your application and someone from our team will be reaching out to you shortly to discuss next steps.</p>
              <p>We value your time and look forward to learning more about you.</p>
              <p style="margin-top:24px;">Best regards,<br/>The NGR Team<br/><a href="https://oknextgen.com" style="color:#dc2626;">oknextgen.com</a></p>
            </div>
          </div>`
        );
      } else {
        console.warn("No email on applicant record, skipping applicant email");
      }

      // Send routing notification to internal contact
      await sendEmail(
        routing.email,
        `New Applicant — ${applicant.desired_position} — ${applicant.full_name}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1e293b;color:white;padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Applicant Routed to You</h1>
          </div>
          <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;font-weight:bold;">Name:</td><td>${applicant.full_name}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Email:</td><td><a href="mailto:${applicant.email}">${applicant.email}</a></td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Phone:</td><td>${applicant.phone}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Desired Role:</td><td>${applicant.desired_position}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Applied:</td><td>${new Date(applicant.created_at).toLocaleDateString()}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">DNA Score:</td><td>${applicant.dna_score}/30</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Alignment:</td><td>${applicant.alignment_category}</td></tr>
            </table>
          </div>
        </div>`
      );

      // Update routing_notified_at
      await adminClient
        .from("job_applications")
        .update({ routing_notified_at: new Date().toISOString() } as any)
        .eq("id", applicantId);
    }

    if (newStage === "scheduled_interview") {
      const interviewDate = interviewDateTime
        ? new Date(interviewDateTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/Chicago" })
        : "TBD";

      // Email to applicant
      if (applicant.email) {
        await sendEmail(
          applicant.email,
          "Your Interview is Scheduled — Next Generation Roofing",
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#dc2626;color:white;padding:24px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;font-size:22px;">Interview Confirmed</h1>
            </div>
            <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
              <p>Hi ${applicant.full_name},</p>
              <p>Great news! Your interview with Next Generation Roofing has been scheduled.</p>
              <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="font-size:18px;font-weight:bold;color:#1e293b;margin:0;">📅 ${interviewDate}</p>
              </div>
              <p><strong>What to expect:</strong></p>
              <ul>
                <li>Brief overview of NGR's mission and culture</li>
                <li>Discussion about your experience and goals</li>
                <li>Q&A where you can ask us anything</li>
              </ul>
              <p>If you need to reschedule, please reply to this email or contact us at <a href="mailto:notifications@oknextgen.com">notifications@oknextgen.com</a>.</p>
              <p style="margin-top:24px;">We're looking forward to meeting you!<br/>The NGR Team<br/><a href="https://oknextgen.com" style="color:#dc2626;">oknextgen.com</a></p>
            </div>
          </div>`
        );
      }

      // Notify routing contact
      await sendEmail(
        routing.email,
        `Interview Scheduled — ${applicant.full_name} — ${interviewDate}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1e293b;color:white;padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">Interview Scheduled</h1>
          </div>
          <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
            <p><strong>${applicant.full_name}</strong> has been scheduled for an interview.</p>
            <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="font-size:16px;font-weight:bold;margin:0;">📅 ${interviewDate}</p>
            </div>
            <p>Desired Role: ${applicant.desired_position}<br/>
            Phone: ${applicant.phone}<br/>
            Email: ${applicant.email}</p>
          </div>
        </div>`
      );
    }

    if (newStage === "hired") {
      // Send to both Matt Fowler and Jonathan Whitton
      const hiredRecipients = [
        { name: "Matt Fowler", email: "m.fowler@oknextgen.com" },
        { name: "Jonathan Whitton", email: "j.whitton@oknextgen.com" },
      ];

      for (const recipient of hiredRecipients) {
        await sendEmail(
          recipient.email,
          `New Contractor Ready for Field — ${applicant.full_name}`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#16a34a;color:white;padding:24px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;font-size:22px;">🎉 New Contractor Ready</h1>
            </div>
            <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
              <p>Hi ${recipient.name},</p>
              <p><strong>${applicant.full_name}</strong> has completed onboarding and is ready for the field.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px 0;font-weight:bold;">Name:</td><td>${applicant.full_name}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;">Role:</td><td>${applicant.desired_position}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;">DNA Score:</td><td>${applicant.dna_score}/30 — ${applicant.alignment_category}</td></tr>
                <tr><td style="padding:8px 0;font-weight:bold;">Start Date:</td><td>${applicant.start_date || "Not set"}</td></tr>
              </table>
              <p>This contractor is ready to be assigned to a team.</p>
              <p style="margin-top:24px;">— NGR Dashboard</p>
            </div>
          </div>`
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
