import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, Image as ImageIcon } from "lucide-react";
import { HAIL_ASSESSMENT_SECTIONS } from "@/data/hailAssessmentChecklist";

const resultBadge: Record<string, { label: string; className: string }> = {
  no_damage: { label: "No Damage", className: "bg-green-600 text-white" },
  possible_damage: { label: "Possible Damage", className: "bg-amber-500 text-white" },
  confirmed_damage: { label: "Confirmed Damage", className: "bg-red-600 text-white" },
};

export default function HailAssessmentsTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["admin-hail-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_hail_assessments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = assessments.find((a) => a.id === selectedId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">All submitted commercial hail assessments across the team.</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No assessments submitted yet.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Inspector</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Property</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Address</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Photos</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => {
                  const photoCount = Array.isArray(a.photo_paths) ? (a.photo_paths as string[]).length : 0;
                  const badge = a.result ? resultBadge[a.result] : null;
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedId(a.id)}
                    >
                      <td className="px-4 py-2">{format(new Date(a.created_at), "MMM d, yyyy")}</td>
                      <td className="px-4 py-2">{a.inspector_name}</td>
                      <td className="px-4 py-2 font-medium">{a.property_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.address || "—"}</td>
                      <td className="px-4 py-2">
                        {badge ? <Badge className={badge.className}>{badge.label}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5" /> {photoCount}
                        </span>
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
      <Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-xl">
          {selected && <AssessmentDetail assessment={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AssessmentDetail({ assessment }: { assessment: any }) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);

  const badge = assessment.result ? resultBadge[assessment.result] : null;
  const formData = (assessment.form_data || {}) as any;
  const photoPaths = (assessment.photo_paths || []) as string[];

  const loadPhotos = async () => {
    if (photosLoaded || photoPaths.length === 0) return;
    setLoadingPhotos(true);
    const urls: Record<string, string> = {};
    for (const path of photoPaths) {
      const { data } = await supabase.storage.from("hail-assessment-photos").createSignedUrl(path, 3600);
      if (data?.signedUrl) urls[path] = data.signedUrl;
    }
    setSignedUrls(urls);
    setLoadingPhotos(false);
    setPhotosLoaded(true);
  };

  // Load photos on mount
  useState(() => { loadPhotos(); });

  const checkedItems = formData.checked || {};
  const notes = formData.notes || {};
  const docLinks = formData.docLinks || {};
  const photoMap = formData.photoMap || {};
  const resultPhotoMap = formData.resultPhotoMap || {};

  return (
    <ScrollArea className="h-full pr-4">
      <SheetHeader>
        <SheetTitle className="text-lg">{assessment.property_name}</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 mt-4">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Inspector:</span> {assessment.inspector_name}</div>
          <div><span className="text-muted-foreground">Date:</span> {format(new Date(assessment.inspection_date), "MMM d, yyyy")}</div>
          {assessment.address && <div><span className="text-muted-foreground">Address:</span> {assessment.address}</div>}
          {assessment.storm_date && <div><span className="text-muted-foreground">Storm Date:</span> {format(new Date(assessment.storm_date), "MMM d, yyyy")}</div>}
        </div>

        {/* Result */}
        {badge && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Result:</span>
            <Badge className={badge.className}>{badge.label}</Badge>
          </div>
        )}
        {assessment.result_notes && (
          <div className="text-sm"><span className="text-muted-foreground">Result Notes:</span> {assessment.result_notes}</div>
        )}
        {assessment.result_doc_link && (
          <a href={assessment.result_doc_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
            Result Document <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Sections */}
        {HAIL_ASSESSMENT_SECTIONS.filter((s) => s.type !== "single-select").map((section) => {
          const sectionItems = section.items?.filter((item) => checkedItems[item.id]) || [];
          if (sectionItems.length === 0) return null;

          return (
            <div key={section.id} className="space-y-2">
              <h3 className="text-sm font-medium text-foreground border-b border-border pb-1">§{section.sectionNumber} — {section.title}</h3>
              {sectionItems.map((item) => {
                const itemPhotoPaths: string[] = photoMap[item.id] || [];
                const itemDocLink = docLinks[item.id];
                const itemNote = notes[item.id];
                return (
                  <div key={item.id} className="ml-2 space-y-1">
                    <p className="text-sm text-foreground">✓ {item.label}</p>
                    {itemNote && <p className="text-xs text-muted-foreground ml-4">Note: {itemNote}</p>}
                    {itemDocLink && (
                      <a href={itemDocLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-4 flex items-center gap-1">
                        Doc Link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {itemPhotoPaths.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-4">
                        {itemPhotoPaths.map((path) => (
                          signedUrls[path] ? (
                            <a key={path} href={signedUrls[path]} target="_blank" rel="noopener noreferrer">
                              <img src={signedUrls[path]} alt="" className="w-14 h-14 object-cover rounded border border-border" />
                            </a>
                          ) : (
                            <div key={path} className="w-14 h-14 rounded border border-border bg-muted flex items-center justify-center">
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Result photos */}
        {Object.entries(resultPhotoMap).map(([optionId, paths]) => {
          const photoPaths = paths as string[];
          if (photoPaths.length === 0) return null;
          return (
            <div key={optionId} className="space-y-1">
              <h3 className="text-sm font-medium text-foreground border-b border-border pb-1">Result Photos</h3>
              <div className="flex flex-wrap gap-1">
                {photoPaths.map((path) => (
                  signedUrls[path] ? (
                    <a key={path} href={signedUrls[path]} target="_blank" rel="noopener noreferrer">
                      <img src={signedUrls[path]} alt="" className="w-14 h-14 object-cover rounded border border-border" />
                    </a>
                  ) : (
                    <div key={path} className="w-14 h-14 rounded border border-border bg-muted flex items-center justify-center">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  )
                ))}
              </div>
            </div>
          );
        })}

        {loadingPhotos && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading photos…
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
