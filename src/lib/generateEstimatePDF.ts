import jsPDF from "jspdf";

export interface EstimatePDFData {
  jobInfo: { customer: string; city: string; state: string; jobNumber: string };
  protProduct: string;
  protFootage: number;
  gutterSize: string;
  gutterColor: string;
  gutterFootage: number;
  dsTotalFootage: number;
  addons: { name: string; qty: string; unit: string }[];
  clampedQuoted: number;
  totalRetail: number;
  validityDays?: number;
  approvedAt?: string;
  logoBase64?: string;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function loadLogoBase64(logoSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = logoSrc;
  });
}

export async function buildEstimatePDF(data: EstimatePDFData): Promise<jsPDF> {
  const {
    jobInfo, protProduct, protFootage, gutterSize, gutterColor, gutterFootage,
    dsTotalFootage, addons, clampedQuoted, totalRetail, validityDays, approvedAt, logoBase64,
  } = data;

  const vDays = validityDays || 7;
  const issueDate = approvedAt ? new Date(approvedAt) : new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setDate(expiryDate.getDate() + vDays);
  const expiryStr = expiryDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const issueDateStr = issueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const usableW = pageW - margin * 2;
  let y = 15;

  // ── HEADER ──
  if (logoBase64) {
    pdf.addImage(logoBase64, "PNG", pageW / 2 - 10, y, 20, 20);
    y += 24;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("NEXT GENERATION GUTTERING", pageW / 2, y, { align: "center" });
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Customer Estimate", pageW / 2, y, { align: "center" });
  y += 5;
  pdf.setFontSize(9);
  pdf.text(issueDateStr, pageW / 2, y, { align: "center" });
  y += 4;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  // ── CUSTOMER INFO ──
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(9);
  if (jobInfo.customer) { pdf.text(`Customer: ${jobInfo.customer}`, margin, y); y += 5; }
  if (jobInfo.city) { pdf.text(`Location: ${jobInfo.city}${jobInfo.state ? `, ${jobInfo.state}` : ""}`, margin, y); y += 5; }
  if (jobInfo.jobNumber) { pdf.text(`Job #: ${jobInfo.jobNumber}`, margin, y); y += 5; }
  y += 4;

  // ── WHAT'S INCLUDED IN THIS QUOTE ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text("WHAT'S INCLUDED IN THIS QUOTE", margin, y);
  y += 2;
  pdf.setDrawColor(180);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;

  const includedItems = [
    "✓ All labor and installation",
    "✓ Material costs",
    "✓ Applicable taxes",
    "✓ Removal and haul-off of existing gutters",
    "✓ Job site cleanup",
    "✓ All applicable warranties as listed below",
  ];
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(51, 51, 51);
  includedItems.forEach(item => {
    pdf.text(item, margin + 3, y);
    y += 4;
  });
  y += 1;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(102, 102, 102);
  pdf.text("Note: Removal of existing gutters is included unless otherwise specified by your representative in writing.", margin + 3, y);
  y += 7;

  // ── SCOPE OF WORK ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(30, 30, 30);
  pdf.text("Scope of Work", margin, y);
  y += 2;
  pdf.setDrawColor(180);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;

  // Helper to render warranty sub-items
  const renderWarrantyItems = (items: string[]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(68, 68, 68);
    items.forEach(w => {
      pdf.text(w, margin + 5, y);
      y += 4;
    });
  };

  const renderFinePrint = (text: string) => {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(136, 136, 136);
    pdf.text(text, margin + 5, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 30, 30);
  };

  // ── FIX 1: Merged Gutters & Downspouts line item ──
  const hasGutters = gutterFootage > 0;
  const hasDownspouts = dsTotalFootage > 0;

  if (hasGutters || hasDownspouts) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);

    let gutterLabel: string;
    if (hasGutters && hasDownspouts) {
      gutterLabel = `${gutterSize} ${gutterColor === "Premium (+$2/ft)" ? "Premium" : "Standard"} Gutters & Downspouts`;
    } else if (hasGutters) {
      gutterLabel = `${gutterSize} ${gutterColor === "Premium (+$2/ft)" ? "Premium" : "Standard"} Gutters`;
    } else {
      gutterLabel = "Downspouts & Elbows";
    }

    pdf.text(gutterLabel, margin, y);
    // Show combined footage on the right
    const combinedFt = (hasGutters ? gutterFootage : 0) + (hasDownspouts ? dsTotalFootage : 0);
    pdf.text(`${combinedFt} ft`, pageW - margin, y, { align: "right" });
    y += 5;

    // Gutter warranties always appear under the merged line
    renderWarrantyItems([
      "✓ Lifetime Leak-Free Guarantee — With yearly scheduled inspection",
      `✓ 10% Rebate Toward Future Roof Replacement — Value: ${fmt(clampedQuoted * 0.10)}`,
      "✓ 25-Year Baked-On Paint Warranty — Applies to gutters & downspouts",
    ]);
    renderFinePrint("* Check full manufacturer warranty documentation for complete terms.");
    y += 2;
  }

  // ── Protection line item ──
  if (protFootage > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    pdf.text(protProduct, margin, y);
    pdf.text(`${protFootage} ft`, pageW - margin, y, { align: "right" });
    y += 5;

    if (protProduct === "Cheap Mesh") {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(68, 68, 68);
      pdf.text("ℹ No manufacturer warranty — ask your rep about upgrading", margin + 5, y);
      y += 4;
      pdf.text("to a warranted protection product", margin + 8, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(30, 30, 30);
    } else {
      const warrantyYears = protProduct === "Gutter RX Collector" ? "10-Year" : "45-Year";
      renderWarrantyItems([`✓ ${warrantyYears} Manufacturer Warranty`]);
      renderFinePrint("* Check full manufacturer warranty documentation for complete terms.");
    }
    y += 2;
  }

  // ── Add-ons ──
  addons.forEach(a => {
    const qty = parseFloat(a.qty) || 0;
    if (qty > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(a.name, margin, y);
      pdf.text(`${qty} ${a.unit}`, pageW - margin, y, { align: "right" });
      y += 6;
    }
  });

  // Separator
  pdf.setDrawColor(180);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  // ── FIX 3: HOMEOWNER RESPONSIBILITY NOTICE ──
  const noticeBody = "To ensure your installation is completed on schedule, please ensure all items obstructing gutter and downspout access are removed prior to the installation date. This includes but is not limited to: outdoor furniture, vehicles, planters, and decorative items near the roofline. Failure to do so may result in rescheduling.";
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  const noticeLines = pdf.splitTextToSize(noticeBody, usableW - 10);
  const noticeBoxH = 10 + noticeLines.length * 3.5;

  // Light gray background
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(margin, y, usableW, noticeBoxH, 2, 2, "F");
  // Left red accent border
  pdf.setDrawColor(229, 57, 53);
  pdf.setLineWidth(1.5);
  pdf.line(margin, y, margin, y + noticeBoxH);
  pdf.setLineWidth(0.2);

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(51, 51, 51);
  pdf.text("⚠ HOMEOWNER RESPONSIBILITY", margin + 5, y + 6);

  // Body
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(noticeLines, margin + 5, y + 12);

  y += noticeBoxH + 6;

  // ── GRAND TOTAL BOX ──
  const hasDiscount = clampedQuoted < totalRetail;
  const boxH = hasDiscount ? 28 : 18;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.7);
  pdf.roundedRect(margin, y, usableW, boxH, 3, 3);

  if (hasDiscount) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(153, 153, 153);
    pdf.text(`Original Value: ${fmt(totalRetail)}`, pageW - margin - 5, y + 7, { align: "right" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`YOUR PRICE: ${fmt(clampedQuoted)}`, pageW - margin - 5, y + 15, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(46, 125, 50);
    pdf.text(`You Save: ${fmt(totalRetail - clampedQuoted)}`, pageW - margin - 5, y + 22, { align: "right" });
    pdf.setTextColor(30, 30, 30);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(`TOTAL INVESTMENT: ${fmt(clampedQuoted)}`, pageW / 2, y + 10, { align: "center" });
  }
  y += boxH + 4;

  // Rebate value
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Your 10% Rebate Value: ${fmt(clampedQuoted * 0.10)}`, pageW / 2, y, { align: "center" });
  y += 6;

  // ── VALIDITY WARNING ──
  pdf.setFontSize(8);
  pdf.setTextColor(102, 102, 102);
  pdf.text(`⚠ This quote is valid for ${vDays} days from ${issueDateStr}.`, pageW / 2, y, { align: "center" });
  y += 4;
  pdf.text("Contact your representative for extended validity.", pageW / 2, y, { align: "center" });
  y += 8;

  // ── FOOTER ──
  y = Math.max(y + 4, 256);
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Next Generation Guttering | nextgenerationroofing.com", pageW / 2, y, { align: "center" });
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  pdf.text("Thank you for choosing Next Generation Guttering", pageW / 2, y, { align: "center" });
  y += 5;

  // Footer validity warning
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(102, 102, 102);
  pdf.text(`⚠ Quote valid for ${vDays} days from date of issue (${expiryStr}).`, pageW / 2, y, { align: "center" });
  y += 4;
  pdf.text("Pricing subject to change after expiration. Contact your representative for questions.", pageW / 2, y, { align: "center" });

  return pdf;
}
