import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Eye, Link2, ClipboardList, Building2 } from "lucide-react";
import { format } from "date-fns";
import SendReportModal from "@/components/shared/SendReportModal";
import JobSearchInput from "@/components/shared/JobSearchInput";
import { toast } from "sonner";

interface SavedItem {
  id: string;
  type: "hail_assessment" | "production_checklist";
  propertyName: string;
  address: string | null;
  homeownerName: string | null;
  inspectorName: string | null;
  result: string | null;
  savedAt: string;
  finalized: boolean;
  jobId: string | null;
}

const resultLabels: Record<string, { label: string; className: string }> = {
  no_damage: { label: "No Damage", className: "bg-green-600 text-white" },
  possible_damage: { label: "Possible", className: "bg-amber-500 text-white" },
  confirmed_damage: { label: "Confirmed", className: "bg-red-600 text-white" },
};

export default function SavedChecklists() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [detailItem, setDetailItem] = useState<SavedItem | null>(null);
  const [sendItem, setSendItem] = useState<SavedItem | null>(null);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["saved-checklists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const results: SavedItem[] = [];

      // Fetch hail assessments
      const { data: hail } = await (supabase.from("commercial_hail_assessments") as any)
        .select("id, property_name, address, homeowner_name, inspector_name, result, saved_at, report_finalized, job_id")
        .eq("submitted_by", user!.id)
        .not("saved_at", "is", null)
        .order("saved_at", { ascending: false });

      (hail || []).forEach((h: any) => {
        results.push({
          id: h.id, type: "hail_assessment", propertyName: h.property_name,
          address: h.address, homeownerName: h.homeowner_name, inspectorName: h.inspector_name,
          result: h.result, savedAt: h.saved_at, finalized: h.report_finalized, jobId: h.job_id,
        });
      });

      // Fetch production checklist submissions
      const { data: prod } = await (supabase.from("production_checklist_submissions") as any)
        .select("id, job_address, homeowner_name, saved_at, report_finalized, job_id, notes")
        .eq("user_id", user!.id)
        .not("saved_at", "is", null)
        .order("saved_at", { ascending: false });

      (prod || []).forEach((p: any) => {
        results.push({
          id: p.id, type: "production_checklist", propertyName: p.job_address || "Untitled",
          address: p.job_address, homeownerName: p.homeowner_name, inspectorName: null,
          result: null, savedAt: p.saved_at, finalized: p.report_finalized, jobId: p.job_id,
        });
      });

      results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      return results;
    },
  });

  const handleAssignJob = async (item: SavedItem, job: { id: string; label: string } | null) => {
    if (!job) return;
    const table = item.type === "hail_assessment" ? "commercial_hail_assessments" : "production_checklist_submissions";
    const { error } = await (supabase.from(table) as any).update({ job_id: job.id }).eq("id", item.id);
    if (error) { toast.error("Failed to assign job"); return; }
    toast.success("Job assigned");
    setAssigningJobId(null);
    queryClient.invalidateQueries({ queryKey: ["saved-checklists"] });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Saved Checklists
        </h1>
        <p className="text-sm text-muted-foreground">View, send, and manage your saved inspection reports</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No saved checklists yet.</CardContent></Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Property / Job</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Homeowner</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const badge = item.result ? resultLabels[item.result] : null;
                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">
                          {item.type === "hail_assessment" ? <><Building2 className="h-3 w-3 mr-1" />Hail</> : <><ClipboardList className="h-3 w-3 mr-1" />Production</>}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{format(new Date(item.savedAt), "MMM d, yyyy")}</td>
                      <td className="px-4 py-2 font-medium">{item.propertyName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.homeownerName || "—"}</td>
                      <td className="px-4 py-2">
                        {badge ? <Badge className={badge.className}>{badge.label}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        {item.finalized
                          ? <Badge className="bg-green-600 text-white text-xs">✓ Finalized</Badge>
                          : <Badge variant="outline" className="text-xs">Pending</Badge>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetailItem(item)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setSendItem(item)}><Send className="h-3.5 w-3.5" /></Button>
                          {!item.jobId && (
                            assigningJobId === item.id ? (
                              <div className="w-48">
                                <JobSearchInput value={null} onChange={(job) => handleAssignJob(item, job)} placeholder="Search job…" />
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setAssigningJobId(item.id)}><Link2 className="h-3.5 w-3.5" /></Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <SheetContent className="w-full sm:max-w-lg">
          {detailItem && (
            <ScrollArea className="h-full pr-4">
              <SheetHeader><SheetTitle>{detailItem.propertyName}</SheetTitle></SheetHeader>
              <div className="space-y-3 mt-4 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {detailItem.type === "hail_assessment" ? "Hail Assessment" : "Production Checklist"}</div>
                {detailItem.address && <div><span className="text-muted-foreground">Address:</span> {detailItem.address}</div>}
                {detailItem.homeownerName && <div><span className="text-muted-foreground">Homeowner:</span> {detailItem.homeownerName}</div>}
                {detailItem.inspectorName && <div><span className="text-muted-foreground">Inspector:</span> {detailItem.inspectorName}</div>}
                {detailItem.result && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Result:</span>
                    {resultLabels[detailItem.result] && <Badge className={resultLabels[detailItem.result].className}>{resultLabels[detailItem.result].label}</Badge>}
                  </div>
                )}
                <div><span className="text-muted-foreground">Saved:</span> {format(new Date(detailItem.savedAt), "MMM d, yyyy h:mm a")}</div>
                <div><span className="text-muted-foreground">Finalized:</span> {detailItem.finalized ? "Yes" : "No"}</div>
                <Button className="w-full mt-4" onClick={() => { setDetailItem(null); setSendItem(detailItem); }}>
                  <Send className="h-4 w-4 mr-2" /> Send Report
                </Button>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Send Report Modal */}
      {sendItem && (
        <SendReportModal
          open={!!sendItem}
          onOpenChange={(o) => { if (!o) setSendItem(null); }}
          checklistType={sendItem.type}
          submissionId={sendItem.id}
          propertyName={sendItem.propertyName}
          inspectorName={sendItem.inspectorName || profile?.full_name || "Inspector"}
          result={sendItem.result}
          senderName={profile?.full_name || "Team Member"}
          onSent={() => queryClient.invalidateQueries({ queryKey: ["saved-checklists"] })}
        />
      )}
    </div>
  );
}
