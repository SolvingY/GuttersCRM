import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SalesRepData {
  name: string;
  approvedRevenue: number;
  closedDeals: number;
  points: number;
}

interface CanvasserData {
  name: string;
  leadsSet: number;
  leadsClosed: number;
  points: number;
}

interface CompanySummary {
  totalApprovedRevenue: number;
  totalCollections: number;
  totalClosedDeals: number;
  companyLeadCloseRate: number;
  salesRepCount: number;
  canvasserCount: number;
  totalLeadsSet: number;
  totalLeadsClosed: number;
  salesRevenueGoal: number;
  canvasserLeadsGoal: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateEmailHTML(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  summary: CompanySummary,
  frequency: string
): string {
  const salesProgress = summary.salesRevenueGoal 
    ? ((summary.totalApprovedRevenue / summary.salesRevenueGoal) * 100).toFixed(1)
    : '0';
  const leadsProgress = summary.canvasserLeadsGoal 
    ? ((summary.totalLeadsClosed / summary.canvasserLeadsGoal) * 100).toFixed(1)
    : '0';

  const topSalesReps = salesReps.slice(0, 5);
  const topCanvassers = canvassers.slice(0, 5);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frequency === 'weekly' ? 'Weekly' : 'Monthly'} Performance Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 ${frequency === 'weekly' ? 'Weekly' : 'Monthly'} Performance Report</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Generated ${today}</p>
            </td>
          </tr>

          <!-- Goals Progress -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0;">Company Goals Progress</h2>
              
              <!-- Revenue Progress Bar -->
              <div style="margin-bottom: 16px;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: #71717a; font-size: 14px;">Revenue Progress</td>
                    <td style="color: #18181b; font-weight: 600; font-size: 14px; text-align: right;">${salesProgress}%</td>
                  </tr>
                </table>
                <div style="background-color: #e4e4e7; border-radius: 4px; height: 8px; overflow: hidden; margin-top: 4px;">
                  <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); height: 100%; width: ${Math.min(parseFloat(salesProgress), 100)}%; border-radius: 4px;"></div>
                </div>
                <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">${formatCurrency(summary.totalApprovedRevenue)} of ${formatCurrency(summary.salesRevenueGoal)} goal</p>
              </div>

              <!-- Leads Progress Bar -->
              <div>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: #71717a; font-size: 14px;">Leads Progress</td>
                    <td style="color: #18181b; font-weight: 600; font-size: 14px; text-align: right;">${leadsProgress}%</td>
                  </tr>
                </table>
                <div style="background-color: #e4e4e7; border-radius: 4px; height: 8px; overflow: hidden; margin-top: 4px;">
                  <div style="background: linear-gradient(90deg, #059669, #34d399); height: 100%; width: ${Math.min(parseFloat(leadsProgress), 100)}%; border-radius: 4px;"></div>
                </div>
                <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">${summary.totalLeadsClosed} of ${summary.canvasserLeadsGoal} leads closed</p>
              </div>
            </td>
          </tr>

          <!-- Key Metrics -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px; background-color: #f4f4f5; border-radius: 8px; text-align: center; width: 32%;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Total Revenue</p>
                    <p style="color: #18181b; font-size: 18px; font-weight: 700; margin: 4px 0 0 0;">${formatCurrency(summary.totalApprovedRevenue)}</p>
                  </td>
                  <td style="width: 2%;"></td>
                  <td style="padding: 16px; background-color: #f4f4f5; border-radius: 8px; text-align: center; width: 32%;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Closed Deals</p>
                    <p style="color: #18181b; font-size: 18px; font-weight: 700; margin: 4px 0 0 0;">${summary.totalClosedDeals}</p>
                  </td>
                  <td style="width: 2%;"></td>
                  <td style="padding: 16px; background-color: #f4f4f5; border-radius: 8px; text-align: center; width: 32%;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Close Rate</p>
                    <p style="color: #18181b; font-size: 18px; font-weight: 700; margin: 4px 0 0 0;">${summary.companyLeadCloseRate.toFixed(1)}%</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Sales Reps -->
          ${topSalesReps.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">🏆 Top Sales Reps</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #4f46e5;">
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">#</th>
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Name</th>
                  <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Revenue</th>
                  <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Deals</th>
                </tr>
                ${topSalesReps.map((rep, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                  <td style="padding: 12px; color: #71717a; font-size: 14px;">${i + 1}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; font-weight: 500;">${rep.name}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${formatCurrency(rep.approvedRevenue)}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${rep.closedDeals}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Top Canvassers -->
          ${topCanvassers.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">🚪 Top Canvassers</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #059669;">
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">#</th>
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Name</th>
                  <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Leads Set</th>
                  <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Closed</th>
                </tr>
                ${topCanvassers.map((c, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                  <td style="padding: 12px; color: #71717a; font-size: 14px;">${i + 1}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; font-weight: 500;">${c.name}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${c.leadsSet}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${c.leadsClosed}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0;">Next Gen Roofing - The 6 Figure System</p>
              <p style="color: #a1a1aa; font-size: 11px; margin: 8px 0 0 0;">This is an automated report. View full details in your admin dashboard.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin role using service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Parse request body
    const { frequency = 'weekly' } = await req.json().catch(() => ({}));
    console.log(`Generating ${frequency} scheduled report...`);

    // Check if scheduled reports are enabled
    const { data: settings } = await supabase
      .from('report_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['scheduled_report_enabled', 'scheduled_report_recipients']);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const isEnabled = settingsMap.get('scheduled_report_enabled') === true || settingsMap.get('scheduled_report_enabled') === 'true';
    
    if (!isEnabled) {
      console.log('Scheduled reports are disabled');
      return new Response(
        JSON.stringify({ message: 'Scheduled reports are disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin emails
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminIds = adminRoles?.map(r => r.user_id) || [];
    
    // Get admin emails from auth
    const adminEmails: string[] = [];
    for (const adminId of adminIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(adminId);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    // Add custom recipients if configured
    const customRecipients = settingsMap.get('scheduled_report_recipients');
    if (Array.isArray(customRecipients)) {
      adminEmails.push(...customRecipients.filter((e: string) => e && e.includes('@')));
    }

    if (adminEmails.length === 0) {
      console.log('No admin emails found to send report');
      return new Response(
        JSON.stringify({ message: 'No recipients configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending report to ${adminEmails.length} recipients`);

    // Fetch company goals
    const { data: goalsData } = await supabase
      .from('company_goals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch sales rep metrics
    const { data: salesMetrics } = await supabase
      .from('user_metrics')
      .select('user_id, display_name, approved_revenue, collections, points, leads, closed_deals')
      .order('metric_date', { ascending: false });

    // Process sales rep data (get latest per user)
    const salesByUser = new Map<string, SalesRepData>();
    salesMetrics?.forEach(m => {
      if (!salesByUser.has(m.user_id)) {
        salesByUser.set(m.user_id, {
          name: m.display_name || 'Unknown',
          approvedRevenue: Number(m.approved_revenue) || 0,
          closedDeals: Number(m.closed_deals) || 0,
          points: Number(m.points) || 0,
        });
      }
    });
    const salesReps = Array.from(salesByUser.values()).sort((a, b) => b.approvedRevenue - a.approvedRevenue);

    // Fetch canvasser metrics
    const { data: canvasserMetrics } = await supabase
      .from('canvasser_metrics')
      .select('user_id, display_name, leads_set, leads_closed, points')
      .order('metric_date', { ascending: false });

    // Process canvasser data
    const canvassersByUser = new Map<string, CanvasserData>();
    canvasserMetrics?.forEach(m => {
      if (!canvassersByUser.has(m.user_id)) {
        canvassersByUser.set(m.user_id, {
          name: m.display_name || 'Unknown',
          leadsSet: Number(m.leads_set) || 0,
          leadsClosed: Number(m.leads_closed) || 0,
          points: Number(m.points) || 0,
        });
      }
    });
    const canvassers = Array.from(canvassersByUser.values()).sort((a, b) => b.leadsSet - a.leadsSet);

    // Calculate summary
    const totalApprovedRevenue = salesReps.reduce((sum, r) => sum + r.approvedRevenue, 0);
    const totalClosedDeals = salesReps.reduce((sum, r) => sum + r.closedDeals, 0);
    const totalLeads = salesMetrics?.reduce((sum, m) => sum + (Number(m.leads) || 0), 0) || 0;
    const totalLeadsSet = canvassers.reduce((sum, c) => sum + c.leadsSet, 0);
    const totalLeadsClosed = canvassers.reduce((sum, c) => sum + c.leadsClosed, 0);

    const summary: CompanySummary = {
      totalApprovedRevenue,
      totalCollections: 0,
      totalClosedDeals,
      companyLeadCloseRate: totalLeads > 0 ? (totalClosedDeals / totalLeads) * 100 : 0,
      salesRepCount: salesReps.length,
      canvasserCount: canvassers.length,
      totalLeadsSet,
      totalLeadsClosed,
      salesRevenueGoal: goalsData?.sales_revenue_goal || 0,
      canvasserLeadsGoal: goalsData?.canvasser_leads_goal || 0,
    };

    // Generate email HTML
    const emailHtml = generateEmailHTML(salesReps, canvassers, summary, frequency);

    // Send emails using Resend API directly
    const results = [];
    for (const email of adminEmails) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Next Gen Roofing <onboarding@resend.dev>",
            to: [email],
            subject: `📊 ${frequency === 'weekly' ? 'Weekly' : 'Monthly'} Performance Report - ${new Date().toLocaleDateString()}`,
            html: emailHtml,
          }),
        });
        const result = await response.json();
        console.log(`Email sent to ${email}:`, result);
        results.push({ email, success: response.ok, id: result.id });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${email}:`, emailError);
        results.push({ email, success: false, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `${frequency} report sent`, 
        recipients: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error in send-scheduled-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
