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

interface CanvasserWeeklyHours {
  name: string;
  hoursWorked: number;
}

interface CompanyPeriodStats {
  revenue: number;
  collections: number;
  contracts: number;
  leads: number;
  leadToCloseRate: number;
  selfGenContracts: number;
  canvassContracts: number;
  canvassLeads: number;
  internetContracts: number;
  internetLeads: number;
  canvassLtc: number;
  internetLtc: number;
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

function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char] || char));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateCompanySummaryTableHTML(
  weekly: CompanyPeriodStats,
  monthly: CompanyPeriodStats,
  ytd: CompanyPeriodStats
): string {
  const row = (label: string, stats: CompanyPeriodStats, bgColor: string) => `
    <tr style="background-color: ${bgColor};">
      <td style="padding: 12px; color: #18181b; font-size: 14px; font-weight: 600;">${label}</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${formatCurrency(stats.revenue)}</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${formatCurrency(stats.collections)}</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${stats.contracts}</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${stats.leads}</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${stats.selfGenContracts}</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${stats.canvassLtc.toFixed(1)}%</td>
      <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${stats.internetLtc.toFixed(1)}%</td>
    </tr>`;

  return `
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">📈 Company Performance Summary</h2>
        <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #18181b;">
            <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Period</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Revenue</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Collections</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Contracts</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Leads</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Self-Gen</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Canvass LtC</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Internet LtC</th>
          </tr>
          ${row('This Week', weekly, '#ffffff')}
          ${row('This Month', monthly, '#f9fafb')}
          ${row('YTD', ytd, '#ffffff')}
        </table>
        <p style="color: #71717a; font-size: 11px; margin: 8px 0 0 0;">Contracts = Self-Gen + Canvass + Internet. Leads = Canvass + Internet. Self-Gen excluded from LtC %.</p>
      </td>
    </tr>`;
}

function generateEmailHTML(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  summary: CompanySummary,
  frequency: string,
  canvasserWeeklyHours: CanvasserWeeklyHours[],
  weeklyStats: CompanyPeriodStats,
  monthlyStats: CompanyPeriodStats,
  ytdStats: CompanyPeriodStats
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

          <!-- Company Performance Summary (Weekly / Monthly / YTD) -->
          ${generateCompanySummaryTableHTML(weeklyStats, monthlyStats, ytdStats)}

          <!-- Top Sales Reps (YTD) -->
          ${topSalesReps.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">🏆 Top Sales Reps (YTD)</h2>
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
                  <td style="padding: 12px; color: #18181b; font-size: 14px; font-weight: 500;">${escapeHtml(rep.name)}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${formatCurrency(rep.approvedRevenue)}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${rep.closedDeals}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Top Canvassers (YTD) -->
          ${topCanvassers.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">🚪 Top Canvassers (YTD)</h2>
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
                  <td style="padding: 12px; color: #18181b; font-size: 14px; font-weight: 500;">${escapeHtml(c.name)}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${c.leadsSet}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${c.leadsClosed}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Canvasser Weekly Hours -->
          ${canvasserWeeklyHours.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">⏱️ Canvasser Hours This Week</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #7c3aed;">
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">#</th>
                  <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Name</th>
                  <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Hours</th>
                </tr>
                ${canvasserWeeklyHours.map((c, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                  <td style="padding: 12px; color: #71717a; font-size: 14px;">${i + 1}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; font-weight: 500;">${escapeHtml(c.name)}</td>
                  <td style="padding: 12px; color: #18181b; font-size: 14px; text-align: right;">${c.hoursWorked.toFixed(1)}</td>
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

function calculateLtcRate(canvassDeals: number, internetClosed: number, canvassLeads: number, internetLeads: number): number {
  const totalDeals = canvassDeals + internetClosed;
  const totalLeads = canvassLeads + internetLeads;
  return totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0;
}

// Week starts on Thursday to match the company's Thu–Wed pay period
function getWeekStartThursday(): string {
  const now = new Date();
  // getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // We want the most recent Thursday: offset = (day + 3) % 7 days back
  const offset = (now.getDay() + 3) % 7;
  const thursday = new Date(now);
  thursday.setDate(now.getDate() - offset);
  thursday.setHours(0, 0, 0, 0);
  return thursday.toISOString().split('T')[0];
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    const authHeader = req.headers.get("Authorization");

    // Allow pg_cron invocation via CRON_SECRET (no user JWT required)
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCall) {
      // Standard admin-user JWT flow
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
      const adminCheck = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleData } = await adminCheck
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
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

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
    const adminEmails: string[] = [];
    for (const adminId of adminIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(adminId);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

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

    // Date calculations — week starts Thursday to match the Thu–Wed pay period
    const weekStartStr = getWeekStartThursday();
    const monthStartStr = getMonthStart();

    // ─── Fetch all data in parallel ───
    const [
      goalsResult,
      salesMetricsResult,
      canvasserMetricsResult,
      weeklySalesResult,
      monthlySalesResult,
      weeklyCanvasserResult,
      monthlyCanvasserResult,
    ] = await Promise.all([
      // Company goals
      supabase.from('company_goals').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // YTD sales rep metrics
      supabase.from('user_metrics').select('user_id, display_name, approved_revenue, collections, points, leads, closed_deals, canvass_leads, canvass_deals_closed, internet_leads, internet_leads_closed, self_generated_deals').order('metric_date', { ascending: false }),
      // YTD canvasser metrics
      supabase.from('canvasser_metrics').select('user_id, display_name, leads_set, leads_closed, points').order('metric_date', { ascending: false }),
      // Weekly sales data
      supabase.from('weekly_user_metrics').select('user_id, approved_revenue, collections, closed_deals, leads, canvass_leads, canvass_deals_closed, internet_leads, internet_leads_closed, self_generated_deals').eq('week_start', weekStartStr),
      // Monthly sales data (all weeks in current month)
      supabase.from('weekly_user_metrics').select('user_id, approved_revenue, collections, closed_deals, leads, canvass_leads, canvass_deals_closed, internet_leads, internet_leads_closed, self_generated_deals').gte('week_start', monthStartStr),
      // Weekly canvasser data
      supabase.from('weekly_canvasser_metrics').select('user_id, hours_worked, leads_set, leads_closed').eq('week_start', weekStartStr),
      // Monthly canvasser data
      supabase.from('weekly_canvasser_metrics').select('user_id, leads_set, leads_closed').gte('week_start', monthStartStr),
    ]);

    const goalsData = goalsResult.data;
    const salesMetrics = salesMetricsResult.data;
    const canvasserMetrics = canvasserMetricsResult.data;

    // ─── Process YTD Sales Rep data (latest per user) ───
    const salesByUser = new Map<string, SalesRepData>();
    const ytdSalesAgg = { revenue: 0, collections: 0, selfGenDeals: 0, canvassLeads: 0, canvassDeals: 0, internetLeads: 0, internetClosed: 0 };
    salesMetrics?.forEach(m => {
      if (!salesByUser.has(m.user_id)) {
        salesByUser.set(m.user_id, {
          name: m.display_name || 'Unknown',
          approvedRevenue: Number(m.approved_revenue) || 0,
          closedDeals: Number(m.closed_deals) || 0,
          points: Number(m.points) || 0,
        });
        ytdSalesAgg.revenue += Number(m.approved_revenue) || 0;
        ytdSalesAgg.collections += Number(m.collections) || 0;
        ytdSalesAgg.selfGenDeals += Number((m as any).self_generated_deals) || 0;
        ytdSalesAgg.canvassLeads += Number(m.canvass_leads) || 0;
        ytdSalesAgg.canvassDeals += Number(m.canvass_deals_closed) || 0;
        ytdSalesAgg.internetLeads += Number(m.internet_leads) || 0;
        ytdSalesAgg.internetClosed += Number(m.internet_leads_closed) || 0;
      }
    });
    const salesReps = Array.from(salesByUser.values()).sort((a, b) => b.approvedRevenue - a.approvedRevenue);

    // ─── Process YTD Canvasser data ───
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
    const totalLeadsSet = canvassers.reduce((sum, c) => sum + c.leadsSet, 0);
    const totalLeadsClosed = canvassers.reduce((sum, c) => sum + c.leadsClosed, 0);

    // ─── Build Weekly Stats ───
    // Note: weekly_user_metrics doesn't have internet_leads/internet_leads_closed/self_generated_deals yet
    // So for weekly: contracts = closed_deals + canvass_deals_closed, leads = canvass_leads + leads (legacy internet)
    const weeklyData = weeklySalesResult.data || [];
    const weeklyAgg = weeklyData.reduce((acc, m) => ({
      revenue: acc.revenue + (Number(m.approved_revenue) || 0),
      collections: acc.collections + (Number(m.collections) || 0),
      closedDeals: acc.closedDeals + (Number(m.closed_deals) || 0),
      canvassLeads: acc.canvassLeads + (Number(m.canvass_leads) || 0),
      canvassDeals: acc.canvassDeals + (Number(m.canvass_deals_closed) || 0),
      internetLeads: acc.internetLeads + (Number((m as any).internet_leads) || 0),
      internetClosed: acc.internetClosed + (Number((m as any).internet_leads_closed) || 0),
      selfGenDeals: acc.selfGenDeals + (Number((m as any).self_generated_deals) || 0),
    }), { revenue: 0, collections: 0, closedDeals: 0, canvassLeads: 0, canvassDeals: 0, internetLeads: 0, internetClosed: 0, selfGenDeals: 0 });

    const weeklyCanvasserData = weeklyCanvasserResult.data || [];

    const weeklyTotalContracts = weeklyAgg.selfGenDeals + weeklyAgg.canvassDeals + weeklyAgg.internetClosed;
    const weeklyTotalLeads = weeklyAgg.canvassLeads + weeklyAgg.internetLeads;

    const weeklyStats: CompanyPeriodStats = {
      revenue: weeklyAgg.revenue,
      collections: weeklyAgg.collections,
      contracts: weeklyTotalContracts,
      leads: weeklyTotalLeads,
      leadToCloseRate: calculateLtcRate(weeklyAgg.canvassDeals, weeklyAgg.internetClosed, weeklyAgg.canvassLeads, weeklyAgg.internetLeads),
      selfGenContracts: weeklyAgg.selfGenDeals,
      canvassContracts: weeklyAgg.canvassDeals,
      canvassLeads: weeklyAgg.canvassLeads,
      internetContracts: weeklyAgg.internetClosed,
      internetLeads: weeklyAgg.internetLeads,
      canvassLtc: weeklyAgg.canvassLeads > 0 ? (weeklyAgg.canvassDeals / weeklyAgg.canvassLeads) * 100 : 0,
      internetLtc: weeklyAgg.internetLeads > 0 ? (weeklyAgg.internetClosed / weeklyAgg.internetLeads) * 100 : 0,
    };

    // ─── Build Monthly Stats ───
    const monthlyData = monthlySalesResult.data || [];
    const monthlyAgg = monthlyData.reduce((acc, m) => ({
      revenue: acc.revenue + (Number(m.approved_revenue) || 0),
      collections: acc.collections + (Number(m.collections) || 0),
      closedDeals: acc.closedDeals + (Number(m.closed_deals) || 0),
      canvassLeads: acc.canvassLeads + (Number(m.canvass_leads) || 0),
      canvassDeals: acc.canvassDeals + (Number(m.canvass_deals_closed) || 0),
      internetLeads: acc.internetLeads + (Number((m as any).internet_leads) || 0),
      internetClosed: acc.internetClosed + (Number((m as any).internet_leads_closed) || 0),
      selfGenDeals: acc.selfGenDeals + (Number((m as any).self_generated_deals) || 0),
    }), { revenue: 0, collections: 0, closedDeals: 0, canvassLeads: 0, canvassDeals: 0, internetLeads: 0, internetClosed: 0, selfGenDeals: 0 });

    const monthlyTotalContracts = monthlyAgg.selfGenDeals + monthlyAgg.canvassDeals + monthlyAgg.internetClosed;
    const monthlyTotalLeads = monthlyAgg.canvassLeads + monthlyAgg.internetLeads;

    const monthlyStats: CompanyPeriodStats = {
      revenue: monthlyAgg.revenue,
      collections: monthlyAgg.collections,
      contracts: monthlyTotalContracts,
      leads: monthlyTotalLeads,
      leadToCloseRate: calculateLtcRate(monthlyAgg.canvassDeals, monthlyAgg.internetClosed, monthlyAgg.canvassLeads, monthlyAgg.internetLeads),
      selfGenContracts: monthlyAgg.selfGenDeals,
      canvassContracts: monthlyAgg.canvassDeals,
      canvassLeads: monthlyAgg.canvassLeads,
      internetContracts: monthlyAgg.internetClosed,
      internetLeads: monthlyAgg.internetLeads,
      canvassLtc: monthlyAgg.canvassLeads > 0 ? (monthlyAgg.canvassDeals / monthlyAgg.canvassLeads) * 100 : 0,
      internetLtc: monthlyAgg.internetLeads > 0 ? (monthlyAgg.internetClosed / monthlyAgg.internetLeads) * 100 : 0,
    };

    // ─── Build YTD Stats ───
    const ytdTotalContracts = ytdSalesAgg.selfGenDeals + ytdSalesAgg.canvassDeals + ytdSalesAgg.internetClosed;
    const ytdTotalLeads = ytdSalesAgg.canvassLeads + ytdSalesAgg.internetLeads;

    const ytdStats: CompanyPeriodStats = {
      revenue: ytdSalesAgg.revenue,
      collections: ytdSalesAgg.collections,
      contracts: ytdTotalContracts,
      leads: ytdTotalLeads,
      leadToCloseRate: calculateLtcRate(ytdSalesAgg.canvassDeals, ytdSalesAgg.internetClosed, ytdSalesAgg.canvassLeads, ytdSalesAgg.internetLeads),
      selfGenContracts: ytdSalesAgg.selfGenDeals,
      canvassContracts: ytdSalesAgg.canvassDeals,
      canvassLeads: ytdSalesAgg.canvassLeads,
      internetContracts: ytdSalesAgg.internetClosed,
      internetLeads: ytdSalesAgg.internetLeads,
      canvassLtc: ytdSalesAgg.canvassLeads > 0 ? (ytdSalesAgg.canvassDeals / ytdSalesAgg.canvassLeads) * 100 : 0,
      internetLtc: ytdSalesAgg.internetLeads > 0 ? (ytdSalesAgg.internetClosed / ytdSalesAgg.internetLeads) * 100 : 0,
    };

    // ─── Build Canvasser Weekly Hours ───
    const canvasserWeeklyHours: CanvasserWeeklyHours[] = [];
    for (const wm of weeklyCanvasserData) {
      const hours = Number(wm.hours_worked) || 0;
      if (hours <= 0) continue;
      const canvasserEntry = canvassersByUser.get(wm.user_id);
      let name = canvasserEntry?.name || 'Unknown';
      if (name === 'Unknown') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', wm.user_id)
          .maybeSingle();
        if (profile?.full_name) name = profile.full_name;
      }
      canvasserWeeklyHours.push({ name, hoursWorked: hours });
    }
    canvasserWeeklyHours.sort((a, b) => b.hoursWorked - a.hoursWorked);

    // ─── Company Summary (for goals progress) ───
    const summary: CompanySummary = {
      totalApprovedRevenue: ytdSalesAgg.revenue,
      totalCollections: ytdSalesAgg.collections,
      totalClosedDeals: ytdTotalContracts,
      companyLeadCloseRate: ytdStats.leadToCloseRate,
      salesRepCount: salesReps.length,
      canvasserCount: canvassers.length,
      totalLeadsSet,
      totalLeadsClosed,
      salesRevenueGoal: goalsData?.sales_revenue_goal || 0,
      canvasserLeadsGoal: goalsData?.canvasser_leads_goal || 0,
    };

    // Generate email HTML
    const emailHtml = generateEmailHTML(salesReps, canvassers, summary, frequency, canvasserWeeklyHours, weeklyStats, monthlyStats, ytdStats);

    // Send emails
    const results = [];
    for (let i = 0; i < adminEmails.length; i++) {
      const email = adminEmails[i];
      if (i > 0) await new Promise(r => setTimeout(r, 600));
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Next Gen Roofing <reports@oknextgen.com>",
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
