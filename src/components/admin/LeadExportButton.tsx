import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface LeadExportButtonProps {
  leads: any[];
  salesReps?: { user_id: string; display_name: string | null }[];
}

export function LeadExportButton({ leads, salesReps = [] }: LeadExportButtonProps) {
  const repMap = Object.fromEntries(salesReps.map((r) => [r.user_id, r.display_name || "Unknown"]));

  const escapeCsvField = (value: string | number | null | undefined): string => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExport = () => {
    const headers = [
      "Reference Number", "Date Submitted", "Service Type", "Name", "Email",
      "Phone", "Address", "City", "State", "Zip", "Status", "Priority",
      "Assigned To", "Quote Amount", "Quote Status", "Referral Source", "Follow-up Count",
    ];

    const csvRows = leads.map((l) => [
      l.reference_number || "",
      new Date(l.created_at).toLocaleDateString(),
      l.service_type,
      l.full_name,
      l.email,
      l.phone,
      l.street_address,
      l.city,
      l.state,
      l.zip_code,
      l.status,
      l.priority,
      l.assigned_to ? repMap[l.assigned_to] || l.assigned_to : "Unassigned",
      l.quote_amount || "",
      l.quote_status || "",
      l.referral_source || "",
      l.followup_count || 0,
    ].map(escapeCsvField).join(","));

    const csv = [headers.map(escapeCsvField).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NGR-Leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" /> Export
    </Button>
  );
}
