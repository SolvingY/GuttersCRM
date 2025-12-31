import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteCode: string;
  displayName?: string;
  salesRank?: string;
  yearlyGoal?: number;
  inviteLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - No authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Extract the JWT token and get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if the user has admin role using the has_role function
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Error checking admin role:", roleError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify permissions" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!isAdmin) {
      console.error("User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - Admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Admin verified - proceed with sending the email
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email, inviteCode, displayName, salesRank, yearlyGoal, inviteLink }: InviteEmailRequest = await req.json();

    console.log(`Admin ${user.id} sending invite email to: ${email}`);

    const greeting = displayName ? `Hello ${displayName}` : "Hello";
    const goalText = yearlyGoal && yearlyGoal > 0 
      ? `<p style="margin: 0 0 10px 0;"><strong>Yearly Goal:</strong> $${yearlyGoal.toLocaleString()}</p>`
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">NextGen Roofing</h1>
          <p style="color: #a0aec0; margin: 10px 0 0 0;">Sales Performance Dashboard</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="color: #1a1a2e; margin-top: 0;">${greeting}!</h2>
          
          <p>You've been invited to join the NextGen Roofing Sales Dashboard. This platform will help you track your sales performance, view leaderboards, and monitor your progress toward your goals.</p>
          
          <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d3748;">Your Account Details</h3>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0 0 10px 0;"><strong>Invitation Code:</strong> <code style="background: #edf2f7; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${inviteCode}</code></p>
            <p style="margin: 0 0 10px 0;"><strong>Starting Rank:</strong> ${salesRank || 'SR1'}</p>
            ${goalText}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Create Your Account</a>
          </div>
          
          <p style="color: #718096; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea; font-size: 14px;">${inviteLink}</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #718096; font-size: 14px; margin-bottom: 0;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
        </div>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} NextGen Roofing. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NextGen Roofing <invites@oknextgen.com>",
        to: [email],
        subject: "You're Invited to Join NextGen Roofing Dashboard",
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
