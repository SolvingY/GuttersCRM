import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Eye, Link2, ClipboardList, Building2, ExternalLink, MapPin, User, Phone, Mail, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import SendReportModal from "@/components/shared/SendReportModal";
import JobSearchInput from "@/components/shared/JobSearchInput";
import { toast } from "sonner";

interface SavedItem {
  id: string;
  type: "hail_assessment" | "production_checklist";
  propertyName: string;
  address: string | null;
  homeownerName: string | null;
  homeownerPhone: string | null;
  homeownerEmail: string | null;
  inspectorName: string | null;
  inspectionDate: string | null;
  stormDate: string | null;
  result: string | null;
  savedAt: string;
  finalized: boolean;
  jobId: string | null;
  jobLabel: string | null;
  reportNotes: string | null;
  notes: string | null;
  fullData: any;
}

const resultLabels: Record<string, { label: string; className: string }> = {
  no_damage: { label: "No Damage", className: "bg-green-600 text-white" },
  possible_damage: { label: "Possible", className: "bg-amber-500 text-white" },
  confirmed_damage: { label: "Confirmed", className: "bg-red-600 text-white" },
};

export default function SavedChecklists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [detailItem, setDetailItem] = useState<SavedItem | null>(null);
  const [sendItem, setSendItem] = useState<SavedItem | null>(null);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Team Member");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [checklistTemplate, setChecklistTemplate] = useState<{ title: string; items: Record<string, string> } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => {
      if (data?.full_name) setDisplayName(data.full_name);
    });
  }, [user]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["saved-checklists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const results: SavedItem[] = [];

      // Fetch hail assessments with full data
      const { data: hail } = await (supabase.from("commercial_hail_assessments") as any)
        .select("id, property_name, address, homeowner_name, homeowner_phone, homeowner_email, inspector_name, inspection_date, storm_date, result, saved_at, report_finalized, job_id, report_notes, form_data, photo_paths, result_notes, result_doc_link")
        .eq("submitted_by", user!.id)
        .not("saved_at", "is", null)
        .order("saved_at", { ascending: false });

      // Collect all job IDs for batch lookup
      const jobIds: string[] = [];
      (hail || []).forEach((h: any) => { if (h.job_id) jobIds.push(h.job_id); });

      // Fetch production checklist submissions
      const { data: prod } = await (supabase.from("production_checklist_submissions") as any)
        .select("id, job_address, homeowner_name, homeowner_phone, homeowner_email, saved_at, report_finalized, job_id, notes, report_notes, responses, checklist_id")
        .eq("user_id", user!.id)
        .not("saved_at", "is", null)
        .order("saved_at", { ascending: false });

      (prod || []).forEach((p: any) => { if (p.job_id) jobIds.push(p.job_id); });

      // Batch fetch job labels
      const jobMap: Record<string, string> = {};
      if (jobIds.length > 0) {
        const uniqueIds = [...new Set(jobIds)];
        const { data: jobs } = await supabase.from("quote_requests").select("id, full_name, street_address").in("id", uniqueIds);
        (jobs || []).forEach((j: any) => {
          jobMap[j.id] = `${j.full_name || ""}${j.street_address ? ` — ${j.street_address}` : ""}`.trim();
        });
      }

      (hail || []).forEach((h: any) => {
        results.push({
          id: h.id, type: "hail_assessment", propertyName: h.property_name,
          address: h.address, homeownerName: h.homeowner_name, homeownerPhone: h.homeowner_phone,
          homeownerEmail: h.homeowner_email, inspectorName: h.inspector_name,
          inspectionDate: h.inspection_date, stormDate: h.storm_date,
          result: h.result, savedAt: h.saved_at, finalized: h.report_finalized,
          jobId: h.job_id, jobLabel: h.job_id ? jobMap[h.job_id] || "Linked Job" : null,
          reportNotes: h.report_notes, notes: h.result_notes,
          fullData: { formData: h.form_data, photoPaths: h.photo_paths, resultDocLink: h.result_doc_link },
        });
      });

      (prod || []).forEach((p: any) => {
        results.push({
          id: p.id, type: "production_checklist", propertyName: p.job_address || "Untitled",
          address: p.job_address, homeownerName: p.homeowner_name, homeownerPhone: p.homeowner_phone,
          homeownerEmail: p.homeowner_email, inspectorName: null,
          inspectionDate: null, stormDate: null,
          result: null, savedAt: p.saved_at, finalized: p.report_finalized,
          jobId: p.job_id, jobLabel: p.job_id ? jobMap[p.job_id] || "Linked Job" : null,
          reportNotes: p.report_notes, notes: p.notes,
          fullData: { responses: p.responses, checklistId: p.checklist_id },
        });
      });

      results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      return results;
    },
  });

  // Load photos when detail item opens (hail assessments)
  useEffect(() => {
    if (!detailItem || detailItem.type !== "hail_assessment") { setPhotoUrls({}); return; }
    const paths: string[] = detailItem.fullData?.photoPaths || [];
    if (paths.length === 0) return;

    const loadPhotos = async () => {
      const urls: Record<string, string> = {};
      for (const path of paths.slice(0, 20)) {
        const { data } = await supabase.storage.from("hail-assessment-photos").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls[path] = data.signedUrl;
      }
      setPhotoUrls(urls);
    };
    loadPhotos();
  }, [detailItem]);

  // Load checklist template for production checklists
  useEffect(() => {
    if (!detailItem || detailItem.type !== "production_checklist") { setChecklistTemplate(null); return; }
    const checklistId = detailItem.fullData?.checklistId;
    if (!checklistId) { setChecklistTemplate(null); return; }

    const loadTemplate = async () => {
      const { data } = await (supabase.from("production_checklists") as any)
        .select("title, checklist_items")
        .eq("id", checklistId)
        .single();
      if (data) {
        const itemMap: Record<string, string> = {};
        const items = Array.isArray(data.checklist_items) ? data.checklist_items : [];
        items.forEach((item: any) => {
          if (item.id && item.label) itemMap[item.id] = item.label;
        });
        setChecklistTemplate({ title: data.title, items: itemMap });
      }
    };
    loadTemplate();
  }, [detailItem]);

  const handleAssignJob = async (item: SavedItem, job: { id: string; label: string } | null) => {
    if (!job || !user) return;
    const table = item.type === "hail_assessment" ? "commercial_hail_assessments" : "production_checklist_submissions";
    const { error } = await (supabase.from(table) as any).update({ job_id: job.id }).eq("id", item.id);
    if (error) { toast.error("Failed to assign job"); return; }

    // Also insert into lead_files
    const fileName = item.type === "hail_assessment"
      ? `Hail Assessment — ${item.propertyName}`
      : `Production Checklist — ${item.propertyName}`;
    await (supabase.from("lead_files") as any).insert({
      lead_id: job.id,
      uploaded_by: user.id,
      file_name: fileName,
      file_url: `checklist://${item.type}/${item.id}`,
      file_type: "checklist",
    });

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

      {/* Full Report Detail Drawer */}
      <Sheet open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <SheetContent className="w-full sm:max-w-lg">
          {detailItem && (
            <ScrollArea className="h-full pr-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detailItem.propertyName}
                  {detailItem.result && resultLabels[detailItem.result] && (
                    <Badge className={resultLabels[detailItem.result].className}>{resultLabels[detailItem.result].label}</Badge>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5 mt-4">
                {/* Type & Status */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {detailItem.type === "hail_assessment" ? "Hail Assessment" : "Production Checklist"}
                  </Badge>
                  {detailItem.finalized
                    ? <Badge className="bg-green-600 text-white text-xs">✓ Finalized</Badge>
                    : <Badge variant="outline" className="text-xs">Pending</Badge>}
                </div>

                {/* Linked Job */}
                {detailItem.jobId && detailItem.jobLabel && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Linked Job</p>
                    <button
                      onClick={() => navigate(`/admin/leads/${detailItem.jobId}`)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> {detailItem.jobLabel}
                    </button>
                  </div>
                )}

                {/* Meta info */}
                <div className="space-y-2 text-sm">
                  {detailItem.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {detailItem.address}
                    </div>
                  )}
                  {detailItem.homeownerName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" /> {detailItem.homeownerName}
                    </div>
                  )}
                  {detailItem.homeownerPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {detailItem.homeownerPhone}
                    </div>
                  )}
                  {detailItem.homeownerEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {detailItem.homeownerEmail}
                    </div>
                  )}
                  {detailItem.inspectorName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" /> Inspector: {detailItem.inspectorName}
                    </div>
                  )}
                  {detailItem.inspectionDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" /> Inspection: {format(new Date(detailItem.inspectionDate), "MMM d, yyyy")}
                    </div>
                  )}
                  {detailItem.stormDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" /> Storm: {format(new Date(detailItem.stormDate), "MMM d, yyyy")}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" /> Saved: {format(new Date(detailItem.savedAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>

                {/* Checklist Responses (Hail) */}
                {detailItem.type === "hail_assessment" && detailItem.fullData?.formData && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Checked Items</h3>
                    <div className="space-y-1">
                      {Object.entries(detailItem.fullData.formData.checked || {})
                        .filter(([, v]) => v === true)
                        .map(([key]) => (
                          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="text-green-500">✓</span> {key}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Checklist Responses (Production) */}
                {detailItem.type === "production_checklist" && detailItem.fullData?.responses && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {checklistTemplate?.title ? `${checklistTemplate.title} — Items` : "Checklist Items"}
                    </h3>
                    <div className="space-y-1">
                      {Object.entries(detailItem.fullData.responses as Record<string, boolean>).map(([key, checked]) => {
                        const label = checklistTemplate?.items[key] || key;
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={checked ? "text-green-500" : "text-red-400"}>{checked ? "✓" : "✗"}</span> {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Doc Links */}
                {detailItem.type === "hail_assessment" && detailItem.fullData?.formData?.docLinks && (
                  (() => {
                    const links = Object.entries(detailItem.fullData.formData.docLinks as Record<string, string>).filter(([, v]) => v);
                    if (links.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Document Links</h3>
                        <div className="space-y-1">
                          {links.map(([key, url]) => (
                            <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> {url.length > 60 ? url.slice(0, 60) + "…" : url}
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}

                {detailItem.fullData?.resultDocLink && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Result Document</h3>
                    <a href={detailItem.fullData.resultDocLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> {detailItem.fullData.resultDocLink}
                    </a>
                  </div>
                )}

                {/* Photos */}
                {Object.keys(photoUrls).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Photos ({Object.keys(photoUrls).length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(photoUrls).map(([path, url]) => (
                        <a key={path} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="Assessment photo" className="w-full h-20 object-cover rounded-md border border-border hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {detailItem.notes && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailItem.notes}</p>
                  </div>
                )}
                {detailItem.reportNotes && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Report Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailItem.reportNotes}</p>
                  </div>
                )}

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
          inspectorName={sendItem.inspectorName || displayName}
          result={sendItem.result}
          senderName={displayName}
          onSent={() => queryClient.invalidateQueries({ queryKey: ["saved-checklists"] })}
        />
      )}
    </div>
  );
}
