import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserDigestData {
  email: string;
  displayName: string;
  role: string;
  rank?: number;
  points?: number;
  sales?: number;
  leadsSet?: number;
  leadsClosed?: number;
}

interface Contest {
  id: string;
  title: string;
  end_date: string;
  prize_description: string;
  metric_type: string;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char] || char));
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Weekly digest function invoked");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all users with their roles
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`Found ${users.users.length} users`);

    // Fetch user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");
    
    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      throw rolesError;
    }

    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    // Fetch sales rep metrics with rankings
    const { data: salesMetrics, error: salesError } = await supabase
      .from("user_metrics")
      .select("user_id, display_name, points, sales")
      .order("points", { ascending: false });

    if (salesError) {
      console.error("Error fetching sales metrics:", salesError);
      throw salesError;
    }

    // Fetch canvasser metrics with rankings
    const { data: canvasserMetrics, error: canvasserError } = await supabase
      .from("canvasser_metrics")
      .select("user_id, display_name, points, leads_set, leads_closed")
      .order("points", { ascending: false });

    if (canvasserError) {
      console.error("Error fetching canvasser metrics:", canvasserError);
      throw canvasserError;
    }

    // Fetch active contests ending within the next 7 days
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const { data: upcomingContests, error: contestsError } = await supabase
      .from("contests")
      .select("id, title, end_date, prize_description, metric_type")
      .eq("is_active", true)
      .gte("end_date", now.toISOString())
      .lte("end_date", nextWeek.toISOString())
      .order("end_date", { ascending: true });

    if (contestsError) {
      console.error("Error fetching contests:", contestsError);
      throw contestsError;
    }

    console.log(`Found ${upcomingContests?.length || 0} upcoming contests`);

    // Fetch all active contests for inclusion
    const { data: allActiveContests, error: allContestsError } = await supabase
      .from("contests")
      .select("id, title, end_date, prize_description, metric_type")
      .eq("is_active", true)
      .gte("end_date", now.toISOString())
      .order("end_date", { ascending: true })
      .limit(5);

    if (allContestsError) {
      console.error("Error fetching all contests:", allContestsError);
    }

    // Create rankings maps
    const salesRankings = new Map(
      salesMetrics?.map((m, index) => [m.user_id, { rank: index + 1, ...m }]) || []
    );
    const canvasserRankings = new Map(
      canvasserMetrics?.map((m, index) => [m.user_id, { rank: index + 1, ...m }]) || []
    );

    // Get top 5 for leaderboard
    const topSalesReps = salesMetrics?.slice(0, 5) || [];
    const topCanvassers = canvasserMetrics?.slice(0, 5) || [];

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send digest to each user
    for (const user of users.users) {
      const userRole = roleMap.get(user.id) || "user";
      const email = user.email;

      if (!email) {
        console.log(`Skipping user ${user.id} - no email`);
        continue;
      }

      let userMetrics;
      let leaderboardHtml = "";
      let personalStatsHtml = "";

      if (userRole === "canvasser") {
        const userData = canvasserRankings.get(user.id);
        if (userData) {
          personalStatsHtml = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #333;">Your Stats</h3>
              <p style="margin: 4px 0; color: #666;">
                <strong>Current Rank:</strong> #${userData.rank} of ${canvasserMetrics?.length || 0}
              </p>
              <p style="margin: 4px 0; color: #666;">
                <strong>Points:</strong> ${userData.points || 0}
              </p>
              <p style="margin: 4px 0; color: #666;">
                <strong>Leads Set:</strong> ${userData.leads_set || 0}
              </p>
              <p style="margin: 4px 0; color: #666;">
                <strong>Leads Closed:</strong> ${userData.leads_closed || 0}
              </p>
            </div>
          `;
        }

        // Canvasser leaderboard
        leaderboardHtml = `
          <h3 style="margin: 24px 0 12px 0; color: #333;">🏆 Top Canvassers</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="background: #c41e3a; color: white;">
              <th style="padding: 10px; text-align: left;">Rank</th>
              <th style="padding: 10px; text-align: left;">Name</th>
              <th style="padding: 10px; text-align: right;">Points</th>
            </tr>
            ${topCanvassers.map((c, i) => `
              <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : '#fff'};">
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(c.display_name || 'Unknown')}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${c.points || 0}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        // Sales rep or admin
        const userData = salesRankings.get(user.id);
        if (userData) {
          personalStatsHtml = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #333;">Your Stats</h3>
              <p style="margin: 4px 0; color: #666;">
                <strong>Current Rank:</strong> #${userData.rank} of ${salesMetrics?.length || 0}
              </p>
              <p style="margin: 4px 0; color: #666;">
                <strong>Points:</strong> ${userData.points || 0}
              </p>
              <p style="margin: 4px 0; color: #666;">
                <strong>Sales:</strong> $${(userData.sales || 0).toLocaleString()}
              </p>
            </div>
          `;
        }

        // Sales rep leaderboard
        leaderboardHtml = `
          <h3 style="margin: 24px 0 12px 0; color: #333;">🏆 Top Sales Reps</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="background: #c41e3a; color: white;">
              <th style="padding: 10px; text-align: left;">Rank</th>
              <th style="padding: 10px; text-align: left;">Name</th>
              <th style="padding: 10px; text-align: right;">Points</th>
            </tr>
            ${topSalesReps.map((s, i) => `
              <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : '#fff'};">
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(s.display_name || 'Unknown')}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${s.points || 0}</td>
              </tr>
            `).join('')}
          </table>
        `;
      }

      // Contest deadlines section
      let contestsHtml = "";
      if (allActiveContests && allActiveContests.length > 0) {
        const urgentContests = upcomingContests || [];
        
        contestsHtml = `
          <h3 style="margin: 24px 0 12px 0; color: #333;">🎯 Active Contests</h3>
          ${urgentContests.length > 0 ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 16px;">
              <strong>⚠️ Ending Soon!</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px;">
                ${urgentContests.map(c => `${escapeHtml(c.title)} ends ${new Date(c.end_date).toLocaleDateString()}`).join(', ')}
              </p>
            </div>
          ` : ''}
          <table style="width: 100%; border-collapse: collapse;">
            ${allActiveContests.map(contest => {
              const endDate = new Date(contest.end_date);
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 0;">
                    <strong>${escapeHtml(contest.title)}</strong><br>
                    <span style="font-size: 13px; color: #666;">Prize: ${escapeHtml(contest.prize_description)}</span>
                  </td>
                  <td style="padding: 12px 0; text-align: right; color: ${daysLeft <= 3 ? '#dc3545' : daysLeft <= 7 ? '#ffc107' : '#28a745'};">
                    ${daysLeft} days left
                  </td>
                </tr>
              `;
            }).join('')}
          </table>
        `;
      }

      // Build final email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #c41e3a; margin: 0;">The 6 Figure System</h1>
            <p style="color: #666; margin: 8px 0 0 0;">Weekly Performance Digest</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          
          ${personalStatsHtml}
          ${leaderboardHtml}
          ${contestsHtml}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          
          <div style="text-align: center;">
            <a href="https://preview--ngr-sales-dashboard.lovable.app/dashboard" 
               style="display: inline-block; background: #c41e3a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Full Dashboard
            </a>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #999; margin-top: 32px;">
            Next Generation Roofing - The 6 Figure System<br>
            You're receiving this because you're part of the team.
          </p>
        </body>
        </html>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "Next Gen Roofing <onboarding@resend.dev>",
          to: [email],
          subject: "🏆 Your Weekly Performance Digest - The 6 Figure System",
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          emailsFailed++;
        } else {
          console.log(`Email sent successfully to ${email}`);
          emailsSent++;
        }
      } catch (emailErr) {
        console.error(`Error sending to ${email}:`, emailErr);
        emailsFailed++;
      }
    }

    console.log(`Digest complete: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsFailed,
        totalUsers: users.users.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in weekly digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
