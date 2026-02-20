import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ProfileData {
  name: string;
  roles: string[];
  phone?: string | null;
  birthday?: string | null;
  startDate?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  compensationType?: string | null;
  hourlyRate?: number | null;
  retainerAnnual?: number | null;
  commissionPercentage?: number | null;
  profitSplitPercentage?: number | null;
  managerName?: string | null;
  // Performance
  approvedRevenue?: number;
  closedDeals?: number;
  leads?: number;
  points?: number;
  leadsSet?: number;
  leadsClosed?: number;
  canvasserPoints?: number;
  dnaScore?: number | null;
  alignmentCategory?: string | null;
  // Reviews
  reviews?: any[];
  // Files
  files?: any[];
}

export function ProfilePDFExport({ data }: { data: ProfileData }) {
  const handleExport = () => {
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text(`Contractor Profile: ${data.name}`, 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy")}`, 14, y);
    y += 12;

    // Personal Information
    doc.setFontSize(13);
    doc.text("Personal Information", 14, y);
    y += 6;
    const personalRows: string[][] = [];
    if (data.phone) personalRows.push(["Phone", data.phone]);
    if (data.birthday) personalRows.push(["Birthday", format(new Date(data.birthday), "MMM d, yyyy")]);
    if (data.streetAddress) {
      const addr = [data.streetAddress, data.city, data.state, data.zipCode].filter(Boolean).join(", ");
      personalRows.push(["Address", addr]);
    }
    if (data.emergencyContactName) {
      personalRows.push(["Emergency Contact", `${data.emergencyContactName} (${data.emergencyContactRelationship || "N/A"}) - ${data.emergencyContactPhone || "N/A"}`]);
    }
    if (personalRows.length > 0) {
      autoTable(doc, { startY: y, head: [], body: personalRows, theme: "plain", margin: { left: 14 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Contract Information
    doc.setFontSize(13);
    doc.text("Contract Information", 14, y);
    y += 6;
    const contractRows: string[][] = [];
    if (data.startDate) contractRows.push(["Contract Start Date", format(new Date(data.startDate), "MMM d, yyyy")]);
    if (data.managerName) contractRows.push(["Manager", data.managerName]);
    if (data.compensationType) {
      contractRows.push(["Compensation Type", data.compensationType]);
      if (data.compensationType === "hourly" && data.hourlyRate) contractRows.push(["Hourly Rate", `$${data.hourlyRate}`]);
      if (data.compensationType === "retainer" && data.retainerAnnual) contractRows.push(["Annual Retainer", `$${data.retainerAnnual}`]);
      if (data.compensationType === "commission" && data.commissionPercentage) contractRows.push(["Commission", `${data.commissionPercentage}%`]);
      if (data.compensationType === "profit_split" && data.profitSplitPercentage) contractRows.push(["Profit Split", `${data.profitSplitPercentage}%`]);
    }
    if (contractRows.length > 0) {
      autoTable(doc, { startY: y, head: [], body: contractRows, theme: "plain", margin: { left: 14 } });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // DNA Assessment
    if (data.dnaScore != null) {
      doc.setFontSize(13);
      doc.text("DNA Assessment", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [],
        body: [
          ["Score", `${data.dnaScore}/30`],
          ["Category", data.alignmentCategory || "N/A"],
        ],
        theme: "plain",
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Reviews
    if (data.reviews && data.reviews.length > 0) {
      doc.setFontSize(13);
      doc.text("Review History", 14, y);
      y += 6;
      const reviewRows = data.reviews.map((r: any) => [
        r.quarter,
        format(new Date(r.review_date), "MMM d, yyyy"),
        `${r.overall_rating ?? "N/A"}/5`,
        r.review_notes?.substring(0, 60) || "",
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Quarter", "Date", "Rating", "Notes"]],
        body: reviewRows,
        theme: "striped",
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Documents on File
    if (data.files && data.files.length > 0) {
      doc.setFontSize(13);
      doc.text("Documents on File", 14, y);
      y += 6;
      const fileRows = data.files.map((f: any) => [
        f.file_name,
        f.category_name || "Uncategorized",
        format(new Date(f.created_at), "MMM d, yyyy"),
      ]);
      autoTable(doc, {
        startY: y,
        head: [["File", "Category", "Uploaded"]],
        body: fileRows,
        theme: "striped",
        margin: { left: 14 },
      });
    }

    doc.save(`${data.name.replace(/\s+/g, "_")}_Contractor_Profile.pdf`);
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleExport} className="gap-1 text-xs">
      <FileDown className="w-3.5 h-3.5" />
      Export Profile PDF
    </Button>
  );
}
