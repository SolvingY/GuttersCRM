// xlsx removed - using native CSV export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface SalesRepData {
  name: string;
  salesRank: string;
  approvedRevenue: number;
  collections: number;
  earningsYtd: number;
  points: number;
  leads: number;
  closedDeals: number;
  yearlyGoal: number;
  avgJobSize: number;
  leadToClosePercent: number;
  // Additional fields
  selfGeneratedLeads?: number;
  selfGeneratedDeals?: number;
  canvassLeads?: number;
  canvassDealsClose?: number;
  contestPoints?: number;
  wagerPoints?: number;
}

export interface CanvasserData {
  name: string;
  leadsSet: number;
  leadsClosed: number;
  leadsWithDamage: number;
  hoursWorked: number;
  points: number;
  income: number;
  conversionRate: number;
  // Additional fields
  doorsKnocked?: number;
  yearlyGoal?: number;
  contestPoints?: number;
  wagerPoints?: number;
}

export interface MonthlyProgress {
  month: string;
  revenue: number;
  leads: number;
  revenueGoal?: number;
  leadsGoal?: number;
}

export interface CompanySummary {
  totalApprovedRevenue: number;
  totalCollections: number;
  totalPoints: number;
  totalLeads: number;
  totalClosedDeals: number;
  salesRepCount: number;
  canvasserCount: number;
  companyLeadCloseRate: number;
  salesRevenueGoal?: number;
  canvasserLeadsGoal?: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  targetLeadToCloseRatio?: number;
  targetCostPerLead?: number;
  // Canvasser aggregates
  totalLeadsSet?: number;
  totalLeadsClosed?: number;
  totalLeadsWithDamage?: number;
  totalHoursWorked?: number;
  totalDoorsKnocked?: number;
  totalCanvasserIncome?: number;
  // Progress percentages
  salesProgressPercent?: number;
  leadsProgressPercent?: number;
  actualCostPerLead?: number;
  // Monthly progress data for graph
  monthlyProgress?: MonthlyProgress[];
}

export interface ReportOptions {
  startDate?: Date;
  endDate?: Date;
  includeGraph?: boolean;
  reportTitle?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getDateRangeString = (options?: ReportOptions): string => {
  if (options?.startDate && options?.endDate) {
    return `${format(options.startDate, 'MMM d, yyyy')} - ${format(options.endDate, 'MMM d, yyyy')}`;
  }
  return 'All Time';
};

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(rows: (string | number | null | undefined)[][], filename: string): void {
  const csv = rows.map(r => r.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  companySummary: CompanySummary,
  options?: ReportOptions
): void {
  const today = format(new Date(), 'MM/dd/yyyy');
  const dateRange = getDateRangeString(options);

  const rows: (string | number | null)[][] = [
    ['Company Performance Report'],
    ['Generated:', today],
    ['Date Range:', dateRange],
    [],
    ['SALES TEAM SUMMARY'],
    ['Total Sales Reps', companySummary.salesRepCount],
    ['Total Approved Revenue', formatCurrency(companySummary.totalApprovedRevenue)],
    ['Total Collections', formatCurrency(companySummary.totalCollections)],
    ['Total Points', companySummary.totalPoints],
    ['Total Leads', companySummary.totalLeads],
    ['Total Contracts', companySummary.totalClosedDeals],
    ['Lead-to-Close Rate', `${companySummary.companyLeadCloseRate.toFixed(1)}%`],
    [],
    ['CANVASSER TEAM SUMMARY'],
    ['Total Canvassers', companySummary.canvasserCount],
    ['Total Leads Set', companySummary.totalLeadsSet || 0],
    ['Total Leads Closed', companySummary.totalLeadsClosed || 0],
    ['Total Hours Worked', companySummary.totalHoursWorked || 0],
    ['Total Doors Knocked', companySummary.totalDoorsKnocked || 0],
    [],
  ];

  if (salesReps.length > 0) {
    rows.push(['SALES REPS']);
    rows.push(['Name', 'Rank', 'Approved Revenue', 'Collections', 'YTD Earnings', 'Points', 'Leads', 'Contracts', 'Avg Job Size', 'Close %', 'Yearly Goal']);
    salesReps.forEach(rep => {
      rows.push([
        rep.name, rep.salesRank, formatCurrency(rep.approvedRevenue), formatCurrency(rep.collections),
        formatCurrency(rep.earningsYtd), rep.points, rep.leads, rep.closedDeals,
        formatCurrency(rep.avgJobSize), `${rep.leadToClosePercent.toFixed(1)}%`, formatCurrency(rep.yearlyGoal),
      ]);
    });
    rows.push([]);
  }

  if (canvassers.length > 0) {
    rows.push(['CANVASSERS']);
    rows.push(['Name', 'Leads Set', 'Leads Closed', 'Leads w/ Damage', 'Hours Worked', 'Points', 'Income', 'Conversion %', 'Doors Knocked']);
    canvassers.forEach(c => {
      rows.push([
        c.name, c.leadsSet, c.leadsClosed, c.leadsWithDamage, c.hoursWorked,
        c.points, formatCurrency(c.income), `${c.conversionRate.toFixed(1)}%`, c.doorsKnocked || 0,
      ]);
    });
  }

  const dateStr = options?.startDate
    ? `${format(options.startDate, 'yyyy-MM-dd')}_to_${format(options.endDate!, 'yyyy-MM-dd')}`
    : format(new Date(), 'yyyy-MM-dd');
  downloadCSV(rows, `company-report-${dateStr}.csv`);
}

function drawProgressGraph(doc: jsPDF, companySummary: CompanySummary, startY: number): number {
  const monthlyData = companySummary.monthlyProgress || [];
  if (monthlyData.length === 0) return startY;

  const margin = 14;
  const graphWidth = 180;
  const graphHeight = 60;
  const barWidth = graphWidth / Math.max(monthlyData.length, 1) - 4;

  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Yearly Progress', margin, startY);
  startY += 8;

  // Draw axes
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, startY, margin, startY + graphHeight);
  doc.line(margin, startY + graphHeight, margin + graphWidth, startY + graphHeight);

  // Find max value for scaling
  const maxRevenue = companySummary.salesRevenueGoal || Math.max(...monthlyData.map(m => m.revenue)) || 1;
  
  // Draw bars
  monthlyData.forEach((item, index) => {
    const x = margin + 2 + (index * (barWidth + 4));
    const barHeight = (item.revenue / maxRevenue) * (graphHeight - 10);
    
    // Revenue bar
    doc.setFillColor(79, 70, 229);
    doc.rect(x, startY + graphHeight - barHeight, barWidth / 2 - 1, barHeight, 'F');
    
    // Goal line segment (dashed visual)
    if (item.revenueGoal) {
      const goalHeight = (item.revenueGoal / maxRevenue) * (graphHeight - 10);
      doc.setDrawColor(220, 38, 38);
      doc.line(x, startY + graphHeight - goalHeight, x + barWidth, startY + graphHeight - goalHeight);
    }
    
    // Month label
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(item.month.substring(0, 3), x + 2, startY + graphHeight + 5);
  });

  // Legend
  const legendY = startY + graphHeight + 12;
  doc.setFillColor(79, 70, 229);
  doc.rect(margin, legendY, 8, 4, 'F');
  doc.setFontSize(8);
  doc.text('Revenue', margin + 12, legendY + 3);

  doc.setDrawColor(220, 38, 38);
  doc.line(margin + 50, legendY + 2, margin + 58, legendY + 2);
  doc.text('Goal', margin + 62, legendY + 3);

  return legendY + 15;
}

export function exportToPDF(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  companySummary: CompanySummary,
  options?: ReportOptions
): void {
  const doc = new jsPDF();
  const today = format(new Date(), 'MM/dd/yyyy');
  const dateRange = getDateRangeString(options);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(options?.reportTitle || 'Company Performance Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${today}`, 14, 30);
  doc.text(`Date Range: ${dateRange}`, 14, 36);

  // Goals Progress Section
  let currentY = 46;
  
  if (companySummary.salesRevenueGoal || companySummary.canvasserLeadsGoal) {
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Company Goals Progress', 14, currentY);
    currentY += 8;

    const goalsData: string[][] = [];
    
    if (companySummary.salesRevenueGoal) {
      const salesProgress = (companySummary.totalApprovedRevenue / companySummary.salesRevenueGoal) * 100;
      goalsData.push([
        'Sales Revenue',
        formatCurrency(companySummary.totalApprovedRevenue),
        formatCurrency(companySummary.salesRevenueGoal),
        `${salesProgress.toFixed(1)}%`,
        salesProgress >= 100 ? '✓ Complete' : `${formatCurrency(companySummary.salesRevenueGoal - companySummary.totalApprovedRevenue)} remaining`
      ]);
    }

    if (companySummary.canvasserLeadsGoal) {
      const leadsProgress = ((companySummary.totalLeadsClosed || 0) / companySummary.canvasserLeadsGoal) * 100;
      goalsData.push([
        'Canvasser Leads',
        String(companySummary.totalLeadsClosed || 0),
        String(companySummary.canvasserLeadsGoal),
        `${leadsProgress.toFixed(1)}%`,
        leadsProgress >= 100 ? '✓ Complete' : `${companySummary.canvasserLeadsGoal - (companySummary.totalLeadsClosed || 0)} remaining`
      ]);
    }

    if (companySummary.targetLeadToCloseRatio) {
      goalsData.push([
        'Lead-to-Close %',
        `${companySummary.companyLeadCloseRate.toFixed(1)}%`,
        `${companySummary.targetLeadToCloseRatio}%`,
        companySummary.companyLeadCloseRate >= companySummary.targetLeadToCloseRatio ? 'On Track' : 'Below',
        ''
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Current', 'Goal', 'Progress', 'Status']],
      body: goalsData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Draw Progress Graph if monthly data exists
  if (options?.includeGraph !== false && companySummary.monthlyProgress && companySummary.monthlyProgress.length > 0) {
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    currentY = drawProgressGraph(doc, companySummary, currentY);
  }

  // Executive Summary
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Executive Summary', 14, currentY);

  const summaryTableData = [
    [`${companySummary.salesRepCount} Sales Reps`, `${companySummary.canvasserCount} Canvassers`],
    [formatCurrency(companySummary.totalApprovedRevenue) + ' Revenue', `${companySummary.totalLeadsSet || 0} Leads Set`],
    [`${companySummary.totalClosedDeals} Total Contracts`, `${companySummary.totalLeadsClosed || 0} Leads Closed`],
    [`${companySummary.companyLeadCloseRate.toFixed(1)}% Close Rate`, `${companySummary.totalLeadsWithDamage || 0} w/ Damage`],
    [formatCurrency(companySummary.totalCollections) + ' Collections', `${companySummary.totalHoursWorked || 0} Hours Worked`],
  ];

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Sales Team', 'Canvasser Team']],
    body: summaryTableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10 },
  });

  // Sales Reps Table
  if (salesReps.length > 0) {
    const salesStartY = (doc as any).lastAutoTable.finalY + 15;
    
    if (salesStartY > 240) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Sales Representatives', 14, 20);
      
      autoTable(doc, {
        startY: 24,
        head: [['Name', 'Rank', 'Revenue', 'Collections', 'Points', 'Leads', 'Contracts', 'Close %', 'Avg Job']],
        body: salesReps.map(rep => [
          rep.name,
          rep.salesRank,
          formatCurrency(rep.approvedRevenue),
          formatCurrency(rep.collections),
          rep.points.toLocaleString(),
          rep.leads,
          rep.closedDeals,
          `${rep.leadToClosePercent.toFixed(1)}%`,
          formatCurrency(rep.avgJobSize),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });
    } else {
      doc.setFontSize(14);
      doc.text('Sales Representatives', 14, salesStartY);

      autoTable(doc, {
        startY: salesStartY + 4,
        head: [['Name', 'Rank', 'Revenue', 'Collections', 'Points', 'Leads', 'Contracts', 'Close %', 'Avg Job']],
        body: salesReps.map(rep => [
          rep.name,
          rep.salesRank,
          formatCurrency(rep.approvedRevenue),
          formatCurrency(rep.collections),
          rep.points.toLocaleString(),
          rep.leads,
          rep.closedDeals,
          `${rep.leadToClosePercent.toFixed(1)}%`,
          formatCurrency(rep.avgJobSize),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });
    }
  }

  // Canvassers Table
  if (canvassers.length > 0) {
    const canvasserStartY = (doc as any).lastAutoTable.finalY + 15;
    if (canvasserStartY > 240) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Canvassers', 14, 20);
      
      autoTable(doc, {
        startY: 24,
        head: [['Name', 'Leads Set', 'Leads Closed', 'Damage', 'Hours', 'Points', 'Income', 'Conv %']],
        body: canvassers.map(c => [
          c.name,
          c.leadsSet,
          c.leadsClosed,
          c.leadsWithDamage,
          c.hoursWorked,
          c.points.toLocaleString(),
          formatCurrency(c.income),
          `${c.conversionRate.toFixed(1)}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });
    } else {
      doc.setFontSize(14);
      doc.text('Canvassers', 14, canvasserStartY);

      autoTable(doc, {
        startY: canvasserStartY + 4,
        head: [['Name', 'Leads Set', 'Leads Closed', 'Damage', 'Hours', 'Points', 'Income', 'Conv %']],
        body: canvassers.map(c => [
          c.name,
          c.leadsSet,
          c.leadsClosed,
          c.leadsWithDamage,
          c.hoursWorked,
          c.points.toLocaleString(),
          formatCurrency(c.income),
          `${c.conversionRate.toFixed(1)}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('Next Gen Roofing', 14, 290);
    doc.text(`Report generated ${today}`, 196, 290, { align: 'right' });
  }

  // Download file
  const dateStr = options?.startDate 
    ? `${format(options.startDate, 'yyyy-MM-dd')}_to_${format(options.endDate!, 'yyyy-MM-dd')}`
    : format(new Date(), 'yyyy-MM-dd');
  const filename = `company-report-${dateStr}.pdf`;
  doc.save(filename);
}

// Generate HTML email content for scheduled reports
export function generateEmailReportHTML(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  companySummary: CompanySummary,
  frequency: 'weekly' | 'monthly'
): string {
  const salesProgress = companySummary.salesRevenueGoal 
    ? ((companySummary.totalApprovedRevenue / companySummary.salesRevenueGoal) * 100).toFixed(1)
    : '0';
  const leadsProgress = companySummary.canvasserLeadsGoal 
    ? (((companySummary.totalLeadsClosed || 0) / companySummary.canvasserLeadsGoal) * 100).toFixed(1)
    : '0';

  const topSalesReps = salesReps.slice(0, 5);
  const topCanvassers = canvassers.slice(0, 5);

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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Generated ${format(new Date(), 'MMMM d, yyyy')}</p>
            </td>
          </tr>

          <!-- Goals Progress -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0;">Company Goals Progress</h2>
              
              <!-- Revenue Progress Bar -->
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #71717a; font-size: 14px;">Revenue Progress</span>
                  <span style="color: #18181b; font-weight: 600; font-size: 14px;">${salesProgress}%</span>
                </div>
                <div style="background-color: #e4e4e7; border-radius: 4px; height: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); height: 100%; width: ${Math.min(parseFloat(salesProgress), 100)}%; border-radius: 4px;"></div>
                </div>
                <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">${formatCurrency(companySummary.totalApprovedRevenue)} of ${formatCurrency(companySummary.salesRevenueGoal || 0)} goal</p>
              </div>

              <!-- Leads Progress Bar -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #71717a; font-size: 14px;">Leads Progress</span>
                  <span style="color: #18181b; font-weight: 600; font-size: 14px;">${leadsProgress}%</span>
                </div>
                <div style="background-color: #e4e4e7; border-radius: 4px; height: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #059669, #34d399); height: 100%; width: ${Math.min(parseFloat(leadsProgress), 100)}%; border-radius: 4px;"></div>
                </div>
                <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">${companySummary.totalLeadsClosed || 0} of ${companySummary.canvasserLeadsGoal || 0} leads closed</p>
              </div>
            </td>
          </tr>

          <!-- Key Metrics -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px; background-color: #f4f4f5; border-radius: 8px; text-align: center; width: 33%;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Total Revenue</p>
                    <p style="color: #18181b; font-size: 20px; font-weight: 700; margin: 4px 0 0 0;">${formatCurrency(companySummary.totalApprovedRevenue)}</p>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="padding: 16px; background-color: #f4f4f5; border-radius: 8px; text-align: center; width: 33%;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Closed Deals</p>
                    <p style="color: #18181b; font-size: 20px; font-weight: 700; margin: 4px 0 0 0;">${companySummary.totalClosedDeals}</p>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="padding: 16px; background-color: #f4f4f5; border-radius: 8px; text-align: center; width: 33%;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Close Rate</p>
                    <p style="color: #18181b; font-size: 20px; font-weight: 700; margin: 4px 0 0 0;">${companySummary.companyLeadCloseRate.toFixed(1)}%</p>
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
