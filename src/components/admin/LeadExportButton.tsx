import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface LeadExportButtonProps {
  leads: any[];
  salesReps?: { user_id: string; display_name: string | null }[];
}

export function LeadExportButton({ leads, salesReps = [] }: LeadExportButtonProps) {
  const repMap = Object.fromEntries(salesReps.map((r) => [r.user_id, r.display_name || "Unknown"]));

  const handleExport = () => {
    const rows = leads.map((l) => ({
      "Reference Number": l.reference_number || "",
      "Date Submitted": new Date(l.created_at).toLocaleDateString(),
      "Service Type": l.service_type,
      Name: l.full_name,
      Email: l.email,
      Phone: l.phone,
      Address: l.street_address,
      City: l.city,
      State: l.state,
      Zip: l.zip_code,
      Status: l.status,
      Priority: l.priority,
      "Assigned To": l.assigned_to ? repMap[l.assigned_to] || l.assigned_to : "Unassigned",
      "Quote Amount": l.quote_amount || "",
      "Quote Status": l.quote_status || "",
      "Referral Source": l.referral_source || "",
      "Follow-up Count": l.followup_count || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `NGR-Leads-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" /> Export
    </Button>
  );
}
