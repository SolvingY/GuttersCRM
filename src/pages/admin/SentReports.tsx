import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Eye, ChevronRight } from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportLog {
  id: string;
  checklist_type: string;
  submission_id: string;
  sent_by: string;
  recipients: any[];
  sent_at: string;
  resend_message_id: string | null;
  sender_name?: string;
  property_name?: string;
  result?: string | null;
}

const resultBadge: Record<string, { label: string; className: string }> = {
  no_damage: { label: "No Damage", className: "bg-green-600 text-white" },
  possible_damage: { label: "Possible Damage", className: "bg-amber-500 text-white" },
  confirmed_damage: { label: "Confirmed Damage", className: "bg-red-600 text-white" },
};

function groupByDate(reports: ReportLog[]) {
  const groups: { label: string; items: ReportLog[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "This Month", items: [] },
    { label: "Older", items: [] },
  ];

  for (const r of reports) {
    const d = new Date(r.sent_at);
    if (isToday(d)) groups[0].items.push(r);
    else if (isYesterday(d)) groups[1].items.push(r);
    else if (isThisWeek(d)) groups[2].items.push(r);
    else if (isThisMonth(d)) groups[3].items.push(r);
    else groups[4].items.push(r);
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function SentReports() {
  const [searchParams] = useSearchParams();
  const autoOpenId = searchParams.get("id");
  const [selectedReport, setSelectedReport] = useState<ReportLog | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [checklistTemplate, setChecklistTemplate] = useState<Record<string, string>>({});

  // Fetch all sent reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["sent-reports"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("report_email_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((logs || []).map((l: any) => l.sent_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

      // Fetch hail assessment names
      const hailIds = (logs || []).filter((l: any) => l.checklist_type === "hail_assessment").map((l: any) => l.submission_id);
      const prodIds = (logs || []).filter((l: any) => l.checklist_type === "production_checklist").map((l: any) => l.submission_id);

      let hailMap = new Map<string, { name: string; result: string | null }>();
      let prodMap = new Map<string, { name: string }>();

      if (hailIds.length > 0) {
        const { data: hails } = await supabase
          .from("commercial_hail_assessments")
          .select("id, property_name, result")
          .in("id", hailIds);
        for (const h of hails || []) {
          hailMap.set(h.id, { name: h.property_name, result: h.result });
        }
      }

      if (prodIds.length > 0) {
        const { data: prods } = await supabase
          .from("production_checklist_submissions")
          .select("id, job_address")
          .in("id", prodIds);
        for (const p of prods || []) {
          prodMap.set(p.id, { name: p.job_address || "Untitled" });
        }
      }

      return (logs || []).map((l: any) => {
        const hail = hailMap.get(l.submission_id);
        const prod = prodMap.get(l.submission_id);
        return {
          ...l,
          sender_name: profileMap.get(l.sent_by) || "Unknown",
          property_name: hail?.name || prod?.name || "Unknown",
          result: hail?.result || null,
        } as ReportLog;
      });
    },
  });

  // Auto-open from ?id= param
  useEffect(() => {
    if (autoOpenId && reports.length > 0) {
      const found = reports.find((r) => r.id === autoOpenId);
      if (found) setSelectedReport(found);
    }
  }, [autoOpenId, reports]);

  // Fetch detail when selected
  useEffect(() => {
    if (!selectedReport) {
      setDetailData(null);
      setChecklistTemplate({});
      return;
    }
    setDetailLoading(true);

    const fetchDetail = async () => {
      try {
        if (selectedReport.checklist_type === "hail_assessment") {
          const { data } = await supabase
            .from("commercial_hail_assessments")
            .select("*")
            .eq("id", selectedReport.submission_id)
            .single();
          setDetailData(data);
        } else {
          const { data } = await supabase
            .from("production_checklist_submissions")
            .select("*")
            .eq("id", selectedReport.submission_id)
            .single();
          setDetailData(data);

          // Resolve template labels
          if (data?.checklist_id) {
            const { data: tmpl } = await supabase
              .from("production_checklists")
              .select("title, checklist_items")
              .eq("id", data.checklist_id)
              .single();
            if (tmpl?.checklist_items && Array.isArray(tmpl.checklist_items)) {
              const map: Record<string, string> = {};
              for (const item of tmpl.checklist_items as any[]) {
                if (item.id && item.label) map[item.id] = item.label;
              }
              setChecklistTemplate(map);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching detail:", e);
      }
      setDetailLoading(false);
    };
    fetchDetail();
  }, [selectedReport]);

  const grouped = useMemo(() => groupByDate(reports), [reports]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-foreground">Sent Reports</h1>
          <p className="text-sm text-muted-foreground">All checklist and assessment reports sent via email</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No reports have been sent yet.</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.label}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((r) => {
                    const badge = r.result ? resultBadge[r.result] : null;
                    const recipientNames = (r.recipients || []).map((rec: any) => rec.name || rec.email).join(", ");
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedReport(r)}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.sent_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{r.sender_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {r.checklist_type === "hail_assessment" ? "Hail Assessment" : "Production"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.property_name}</TableCell>
                        <TableCell>
                          {badge ? <Badge className={badge.className}>{badge.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{recipientNames}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Report Detail</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData ? (
            <div className="mt-4 space-y-4">
              {/* Meta */}
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Property:</span> {detailData.property_name || detailData.job_address || "N/A"}</p>
                {detailData.address && <p><span className="text-muted-foreground">Address:</span> {detailData.address}</p>}
                {detailData.homeowner_name && <p><span className="text-muted-foreground">Homeowner:</span> {detailData.homeowner_name}</p>}
                {detailData.homeowner_phone && <p><span className="text-muted-foreground">Phone:</span> {detailData.homeowner_phone}</p>}
                {detailData.inspector_name && <p><span className="text-muted-foreground">Inspector:</span> {detailData.inspector_name}</p>}
                {selectedReport && <p><span className="text-muted-foreground">Sent by:</span> {selectedReport.sender_name}</p>}
                {selectedReport && <p><span className="text-muted-foreground">Sent at:</span> {format(new Date(selectedReport.sent_at), "MMM d, yyyy h:mm a")}</p>}
                {selectedReport?.recipients && (
                  <p><span className="text-muted-foreground">Recipients:</span> {selectedReport.recipients.map((r: any) => r.name || r.email).join(", ")}</p>
                )}
              </div>

              {/* Result */}
              {detailData.result && resultBadge[detailData.result] && (
                <Badge className={resultBadge[detailData.result].className}>{resultBadge[detailData.result].label}</Badge>
              )}

              {/* Notes */}
              {detailData.report_notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Report Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{detailData.report_notes}</p>
                </div>
              )}
              {detailData.result_notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Result Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{detailData.result_notes}</p>
                </div>
              )}
              {detailData.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{detailData.notes}</p>
                </div>
              )}

              {/* Checklist Items */}
              {selectedReport?.checklist_type === "hail_assessment" && detailData.form_data?.checked && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Checklist Items</p>
                  <div className="space-y-1">
                    {Object.entries(detailData.form_data.checked as Record<string, boolean>).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span>{val ? "✅" : "⬜"}</span>
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport?.checklist_type === "production_checklist" && detailData.responses && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Checklist Items</p>
                  <div className="space-y-1">
                    {Object.entries(detailData.responses as Record<string, boolean>).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span>{val ? "✅" : "⬜"}</span>
                        <span>{checklistTemplate[key] || key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Report data not found.</p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
