import * as XLSX from 'xlsx';
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
}

export interface CanvasserData {
  name: string;
  leadsSet: number;
  leadsClosed: number;
  leadsWithDamage: number;
  shiftsWorked: number;
  points: number;
  income: number;
  conversionRate: number;
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
  // Canvasser aggregates
  totalLeadsSet?: number;
  totalLeadsClosed?: number;
  totalLeadsWithDamage?: number;
  totalShiftsWorked?: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function exportToExcel(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  companySummary: CompanySummary
): void {
  const wb = XLSX.utils.book_new();
  const today = format(new Date(), 'MM/dd/yyyy');

  // Company Summary Sheet
  const summaryData = [
    ['Company Performance Report'],
    ['Generated:', today],
    [],
    ['SALES TEAM SUMMARY'],
    ['Metric', 'Value'],
    ['Total Sales Reps', companySummary.salesRepCount],
    ['Total Approved Revenue', formatCurrency(companySummary.totalApprovedRevenue)],
    ['Total Collections', formatCurrency(companySummary.totalCollections)],
    ['Total Points', companySummary.totalPoints.toLocaleString()],
    ['Total Leads', companySummary.totalLeads],
    ['Total Closed Deals', companySummary.totalClosedDeals],
    ['Lead-to-Close Rate', `${companySummary.companyLeadCloseRate.toFixed(1)}%`],
    [],
    ['CANVASSER TEAM SUMMARY'],
    ['Metric', 'Value'],
    ['Total Canvassers', companySummary.canvasserCount],
    ['Total Leads Set', companySummary.totalLeadsSet || 0],
    ['Total Leads Closed', companySummary.totalLeadsClosed || 0],
    ['Total Leads with Damage', companySummary.totalLeadsWithDamage || 0],
    ['Total Shifts Worked', companySummary.totalShiftsWorked || 0],
  ];

  if (companySummary.salesRevenueGoal) {
    const salesProgress = (companySummary.totalApprovedRevenue / companySummary.salesRevenueGoal) * 100;
    summaryData.push(
      [],
      ['GOALS'],
      ['Sales Revenue Goal', formatCurrency(companySummary.salesRevenueGoal)],
      ['Sales Progress', `${salesProgress.toFixed(1)}%`]
    );
  }

  if (companySummary.canvasserLeadsGoal && companySummary.totalLeadsClosed) {
    const leadsProgress = (companySummary.totalLeadsClosed / companySummary.canvasserLeadsGoal) * 100;
    summaryData.push(
      ['Canvasser Leads Goal', companySummary.canvasserLeadsGoal],
      ['Leads Progress', `${leadsProgress.toFixed(1)}%`]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sales Reps Sheet
  const salesHeaders = [
    'Name', 'Rank', 'Approved Revenue', 'Collections', 'YTD Earnings', 
    'Points', 'Leads', 'Closed Deals', 'Avg Job Size', 'Close %', 'Yearly Goal'
  ];
  const salesData = salesReps.map(rep => [
    rep.name,
    rep.salesRank,
    formatCurrency(rep.approvedRevenue),
    formatCurrency(rep.collections),
    formatCurrency(rep.earningsYtd),
    rep.points.toLocaleString(),
    rep.leads,
    rep.closedDeals,
    formatCurrency(rep.avgJobSize),
    `${rep.leadToClosePercent.toFixed(1)}%`,
    formatCurrency(rep.yearlyGoal),
  ]);
  
  const salesSheet = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesData]);
  salesSheet['!cols'] = salesHeaders.map(() => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Reps');

  // Canvassers Sheet
  const canvasserHeaders = [
    'Name', 'Leads Set', 'Leads Closed', 'Leads w/ Damage', 
    'Shifts Worked', 'Points', 'Income', 'Conversion %'
  ];
  const canvasserData = canvassers.map(c => [
    c.name,
    c.leadsSet,
    c.leadsClosed,
    c.leadsWithDamage,
    c.shiftsWorked,
    c.points.toLocaleString(),
    formatCurrency(c.income),
    `${c.conversionRate.toFixed(1)}%`,
  ]);

  const canvasserSheet = XLSX.utils.aoa_to_sheet([canvasserHeaders, ...canvasserData]);
  canvasserSheet['!cols'] = canvasserHeaders.map(() => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, canvasserSheet, 'Canvassers');

  // Download file
  const filename = `company-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportToPDF(
  salesReps: SalesRepData[],
  canvassers: CanvasserData[],
  companySummary: CompanySummary
): void {
  const doc = new jsPDF();
  const today = format(new Date(), 'MM/dd/yyyy');

  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Company Performance Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${today}`, 14, 30);

  // Executive Summary
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Executive Summary', 14, 42);

  const summaryTableData = [
    ['Sales Team', 'Canvasser Team'],
    [`${companySummary.salesRepCount} Reps`, `${companySummary.canvasserCount} Canvassers`],
    [formatCurrency(companySummary.totalApprovedRevenue), `${companySummary.totalLeadsSet || 0} Leads Set`],
    [`${companySummary.totalClosedDeals} Closed Deals`, `${companySummary.totalLeadsClosed || 0} Leads Closed`],
    [`${companySummary.companyLeadCloseRate.toFixed(1)}% Close Rate`, `${companySummary.totalLeadsWithDamage || 0} w/ Damage`],
  ];

  autoTable(doc, {
    startY: 46,
    head: [['Sales Team', 'Canvasser Team']],
    body: summaryTableData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10 },
  });

  // Sales Reps Table
  const salesStartY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Sales Representatives', 14, salesStartY);

  autoTable(doc, {
    startY: salesStartY + 4,
    head: [['Name', 'Rank', 'Revenue', 'Collections', 'Points', 'Close %']],
    body: salesReps.map(rep => [
      rep.name,
      rep.salesRank,
      formatCurrency(rep.approvedRevenue),
      formatCurrency(rep.collections),
      rep.points.toLocaleString(),
      `${rep.leadToClosePercent.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  // Check if we need a new page for canvassers
  const canvasserStartY = (doc as any).lastAutoTable.finalY + 15;
  if (canvasserStartY > 250) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Canvassers', 14, 20);
    
    autoTable(doc, {
      startY: 24,
      head: [['Name', 'Leads Set', 'Leads Closed', 'Damage', 'Points', 'Conv %']],
      body: canvassers.map(c => [
        c.name,
        c.leadsSet,
        c.leadsClosed,
        c.leadsWithDamage,
        c.points.toLocaleString(),
        `${c.conversionRate.toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    });
  } else {
    doc.setFontSize(14);
    doc.text('Canvassers', 14, canvasserStartY);

    autoTable(doc, {
      startY: canvasserStartY + 4,
      head: [['Name', 'Leads Set', 'Leads Closed', 'Damage', 'Points', 'Conv %']],
      body: canvassers.map(c => [
        c.name,
        c.leadsSet,
        c.leadsClosed,
        c.leadsWithDamage,
        c.points.toLocaleString(),
        `${c.conversionRate.toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    });
  }

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  // Download file
  const filename = `company-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
