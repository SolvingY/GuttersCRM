import jsPDF from "jspdf";

interface ContractPDFData {
  ownerName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  contractPrice: string;
  downPayment: string;
  unpaidBalance: string;
  startDate: string;
  completionDate: string;
  lastFourCC: string;
  authPlan: string;
  electronicPayment: boolean;
  otherPayTerms: string;
  scopeOfWork: string;
  repName: string;
  signatureDate: string;
  secondOwnerSignature?: string | null;
  signatureData?: string | null;
  signedAt?: string | null;
  customerSignedName?: string | null;
  signedByName?: string | null;
}

function fmtCurrency(val: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return "$0.00";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function generateContractPDF(data: ContractPDFData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pw - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      addPage();
    }
  };

  // ─── HEADER ───
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Next Generation Guttering", pw / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(12);
  doc.text("INSTALLATION CONTRACT", pw / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("3 NE 8th St, Oklahoma City, OK 73104 • (405) 724-8092 • www.OKNEXTGEN.com", pw / 2, y, { align: "center" });
  y += 3;

  // Signed stamp
  const signedDate = data.signedAt || data.signatureDate;
  if (signedDate) {
    doc.setDrawColor(34, 139, 34);
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const stampText = `✓ SIGNED — ${fmtDate(signedDate)}`;
    const stampW = doc.getTextWidth(stampText) + 8;
    doc.roundedRect(pw / 2 - stampW / 2, y - 1, stampW, 7, 1, 1);
    doc.text(stampText, pw / 2, y + 4, { align: "center" });
    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  }

  // Divider
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 6;

  // ─── CUSTOMER INFO ───
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER INFORMATION", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const infoLines = [
    ["Owner:", data.ownerName],
    ["Address:", `${data.streetAddress}, ${data.city}, ${data.state} ${data.zip}`],
    ["Phone:", data.phone],
    ["Email:", data.email],
  ];
  for (const [label, val] of infoLines) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(val || "—", margin + 22, y);
    y += 5;
  }
  y += 3;

  // ─── SCOPE OF WORK ───
  checkSpace(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SCOPE OF WORK", margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const scopeLines = doc.splitTextToSize(data.scopeOfWork || "—", contentW);
  for (const line of scopeLines) {
    checkSpace(5);
    doc.text(line, margin, y);
    y += 4;
  }
  y += 3;

  // ─── CONTRACT TERMS ───
  checkSpace(40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRACT TERMS", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const terms = [
    ["Contract Price:", fmtCurrency(data.contractPrice)],
    ["Down Payment:", fmtCurrency(data.downPayment)],
    ["Unpaid Balance:", fmtCurrency(data.unpaidBalance)],
    ["Approx Start Date:", fmtDate(data.startDate)],
    ["Approx Completion:", fmtDate(data.completionDate)],
    ["Last 4 CC / SID:", data.lastFourCC || "—"],
    ["Auth Plan #:", data.authPlan || "—"],
    ["Electronic Payment:", data.electronicPayment ? "Yes" : "No"],
  ];
  if (data.otherPayTerms) terms.push(["Other Terms:", data.otherPayTerms]);
  for (const [label, val] of terms) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, margin + 42, y);
    y += 5;
  }
  y += 3;

  // ─── PAYMENT TERMS ───
  checkSpace(50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT TERMS", margin, y);
  y += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  const paymentTerms = [
    "A. Unpaid balance of cash price or bank completion certificate must be paid to Seller's installer at time work is completed.",
    "B. If full price is not paid in cash, contract subject to financing approval.",
    "C. Installation subject to production scheduling, weather conditions. All workmanship guaranteed for one (1) calendar year. Service calls after one (1) year subject to service charge.",
    "D. Buyer may cancel by mailing written notice post-marked no later than third business day after date Agreement signed. If Owner cancels AFTER THREE (3) DAYS from acceptance and before commencement of work, Owner agrees to pay 25% of contract price or cost of materials purchased.",
    "E. IN WITNESS WHEREOF, the parties have executed this Agreement on the date indicated below.",
  ];
  for (const term of paymentTerms) {
    const lines = doc.splitTextToSize(term, contentW);
    for (const l of lines) {
      checkSpace(4);
      doc.text(l, margin, y);
      y += 3.5;
    }
    y += 1.5;
  }
  y += 3;

  // ─── SIGNATURES ───
  checkSpace(50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SIGNATURES", margin, y);
  y += 6;
  doc.setFontSize(9);

  doc.setFont("helvetica", "bold");
  doc.text("Agreement Date:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(data.signatureDate), margin + 38, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Sales Representative:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.repName || "—", margin + 42, y);
  y += 8;

  // Customer signature image
  if (data.signatureData) {
    checkSpace(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const signerLabel = data.customerSignedName || data.signedByName || data.ownerName;
    doc.text(`Customer Signature — ${signerLabel}:`, margin, y);
    y += 3;
    try {
      doc.addImage(data.signatureData, "PNG", margin, y, 70, 25);
      y += 28;
    } catch {
      doc.setFont("helvetica", "italic");
      doc.text("[Signature on file]", margin, y + 5);
      y += 10;
    }
  }

  // Second owner signature
  if (data.secondOwnerSignature) {
    checkSpace(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Second Owner Signature:", margin, y);
    y += 3;
    try {
      doc.addImage(data.secondOwnerSignature, "PNG", margin, y, 70, 25);
      y += 28;
    } catch {
      doc.setFont("helvetica", "italic");
      doc.text("[Signature on file]", margin, y + 5);
      y += 10;
    }
  }

  // ─── FOOTER ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);
    const footerY = doc.internal.pageSize.getHeight() - 8;
    doc.text("Next Generation Guttering • 3 NE 8th St, Oklahoma City, OK 73104 • (405) 724-8092", pw / 2, footerY, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, pw / 2, footerY + 3.5, { align: "center" });
  }

  doc.setTextColor(0, 0, 0);
  return doc;
}

export async function generateAndUploadContractPDF(
  formData: any,
  signatureData: string | null,
  leadId: string,
  uploadedBy: string,
  signedAt?: string | null,
  customerSignedName?: string | null,
  signedByName?: string | null,
): Promise<{ success: boolean; fileUrl?: string }> {
  const { supabase } = await import("@/integrations/supabase/client");

  const pdfData = {
    ownerName: formData.ownerName || "",
    streetAddress: formData.streetAddress || "",
    city: formData.city || "",
    state: formData.state || "",
    zip: formData.zip || "",
    phone: formData.phone || "",
    email: formData.email || "",
    contractPrice: formData.contractPrice || "0",
    downPayment: formData.downPayment || "0",
    unpaidBalance: formData.unpaidBalance || "0",
    startDate: formData.startDate || "",
    completionDate: formData.completionDate || "",
    lastFourCC: formData.lastFourCC || "",
    authPlan: formData.authPlan || "",
    electronicPayment: formData.electronicPayment || false,
    otherPayTerms: formData.otherPayTerms || "",
    scopeOfWork: formData.scopeOfWork || "",
    repName: formData.repName || "",
    signatureDate: formData.signatureDate || "",
    secondOwnerSignature: formData.secondOwnerSignature || null,
    signatureData: signatureData || null,
    signedAt: signedAt || null,
    customerSignedName: customerSignedName || null,
    signedByName: signedByName || null,
  };

  const doc = generateContractPDF(pdfData);
  const blob = doc.output("blob");

  const safeName = (formData.ownerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `NGG_Contract_${safeName}.pdf`;
  const storagePath = `${uploadedBy}/${leadId}/${Date.now()}_${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("lead-files")
    .upload(storagePath, blob, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("PDF upload error:", uploadError);
    return { success: false };
  }

  const { data: urlData } = supabase.storage.from("lead-files").getPublicUrl(storagePath);

  const { error: dbError } = await supabase.from("lead_files").insert({
    lead_id: leadId,
    uploaded_by: uploadedBy,
    file_name: fileName,
    file_url: urlData.publicUrl,
    file_type: "contract",
    file_size: blob.size,
  });

  if (dbError) {
    console.error("PDF DB insert error:", dbError);
    return { success: false };
  }

  // Log activity
  await supabase.from("lead_activity_log").insert({
    lead_id: leadId,
    user_id: uploadedBy,
    activity_type: "file_added",
    content: "Signed contract PDF added to files",
  });

  return { success: true, fileUrl: urlData.publicUrl };
}

export function downloadContractPDF(formData: any, signatureData: string | null, signedAt?: string | null, customerSignedName?: string | null, signedByName?: string | null) {
  const pdfData = {
    ownerName: formData.ownerName || "",
    streetAddress: formData.streetAddress || "",
    city: formData.city || "",
    state: formData.state || "",
    zip: formData.zip || "",
    phone: formData.phone || "",
    email: formData.email || "",
    contractPrice: formData.contractPrice || "0",
    downPayment: formData.downPayment || "0",
    unpaidBalance: formData.unpaidBalance || "0",
    startDate: formData.startDate || "",
    completionDate: formData.completionDate || "",
    lastFourCC: formData.lastFourCC || "",
    authPlan: formData.authPlan || "",
    electronicPayment: formData.electronicPayment || false,
    otherPayTerms: formData.otherPayTerms || "",
    scopeOfWork: formData.scopeOfWork || "",
    repName: formData.repName || "",
    signatureDate: formData.signatureDate || "",
    secondOwnerSignature: formData.secondOwnerSignature || null,
    signatureData: signatureData || null,
    signedAt: signedAt || null,
    customerSignedName: customerSignedName || null,
    signedByName: signedByName || null,
  };

  const doc = generateContractPDF(pdfData);
  const safeName = (formData.ownerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`NGG_Contract_${safeName}.pdf`);
}
