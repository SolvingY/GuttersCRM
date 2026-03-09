import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, X, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HAIL_ASSESSMENT_SECTIONS, type ChecklistSection, type ChecklistItem, type ChecklistResultOption } from "@/data/hailAssessmentChecklist";
import { compressImage, type CompressedImage } from "@/utils/imageCompression";
import JobSearchInput from "@/components/shared/JobSearchInput";
import HomeownerFields from "@/components/shared/HomeownerFields";

type PhotoEntry = { id: string; previewUrl: string; sizeMB: string; name: string; file: Blob };

interface FormState {
  meta: { propertyName: string; address: string; inspectorName: string; inspectionDate: string; stormDate: string };
  applicability: Record<string, boolean>;
  checked: Record<string, boolean>;
  photos: Record<string, PhotoEntry[]>;
  docLinks: Record<string, string>;
  notes: Record<string, string>;
  resultSelection: string | null;
  resultPhotos: Record<string, PhotoEntry[]>;
  resultDocLinks: Record<string, string>;
  resultNotes: Record<string, string>;
}

const initialMeta = { propertyName: "", address: "", inspectorName: "", inspectionDate: "", stormDate: "", reportNotes: "" };

export default function CommercialHailAssessmentForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState>({
    meta: { ...initialMeta },
    applicability: {},
    checked: {},
    photos: {},
    docLinks: {},
    notes: {},
    resultSelection: null,
    resultPhotos: {},
    resultDocLinks: {},
    resultNotes: {},
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "section-1": true });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setMeta = (key: keyof FormState["meta"], value: string) =>
    setForm((f) => ({ ...f, meta: { ...f.meta, [key]: value } }));

  const toggleSection = (id: string) =>
    setOpenSections((o) => ({ ...o, [id]: !o[id] }));

  const setApplicability = (sectionId: string, value: boolean) =>
    setForm((f) => ({ ...f, applicability: { ...f.applicability, [sectionId]: value } }));

  const toggleChecked = (itemId: string) =>
    setForm((f) => ({ ...f, checked: { ...f.checked, [itemId]: !f.checked[itemId] } }));

  const setDocLink = (itemId: string, value: string) =>
    setForm((f) => ({ ...f, docLinks: { ...f.docLinks, [itemId]: value } }));

  const setNote = (itemId: string, value: string) =>
    setForm((f) => ({ ...f, notes: { ...f.notes, [itemId]: value } }));

  const removePhoto = (itemId: string, photoId: string) =>
    setForm((f) => ({ ...f, photos: { ...f.photos, [itemId]: (f.photos[itemId] || []).filter((p) => p.id !== photoId) } }));

  const setResultDocLink = (optionId: string, value: string) =>
    setForm((f) => ({ ...f, resultDocLinks: { ...f.resultDocLinks, [optionId]: value } }));

  const setResultNote = (optionId: string, value: string) =>
    setForm((f) => ({ ...f, resultNotes: { ...f.resultNotes, [optionId]: value } }));

  const removeResultPhoto = (optionId: string, photoId: string) =>
    setForm((f) => ({ ...f, resultPhotos: { ...f.resultPhotos, [optionId]: (f.resultPhotos[optionId] || []).filter((p) => p.id !== photoId) } }));

  const handlePhotos = async (itemId: string, files: FileList | null, isResult = false) => {
    if (!files) return;
    const entries: PhotoEntry[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      entries.push({ id: crypto.randomUUID(), previewUrl: compressed.previewUrl, sizeMB: compressed.sizeMB, name: compressed.name, file: compressed.blob });
    }
    if (isResult) {
      setForm((f) => ({ ...f, resultPhotos: { ...f.resultPhotos, [itemId]: [...(f.resultPhotos[itemId] || []), ...entries] } }));
    } else {
      setForm((f) => ({ ...f, photos: { ...f.photos, [itemId]: [...(f.photos[itemId] || []), ...entries] } }));
    }
  };

  // Section visibility
  const isSectionVisible = (section: ChecklistSection): boolean => {
    if (section.dependsOn) return form.applicability[section.dependsOn] === true;
    if (section.applicabilityQuestion) return form.applicability[section.id] !== undefined;
    return true;
  };

  const isSectionActive = (section: ChecklistSection): boolean => {
    if (section.dependsOn) return form.applicability[section.dependsOn] === true;
    if (section.applicabilityQuestion) return form.applicability[section.id] === true;
    return true;
  };

  // Progress
  const visibleSections = HAIL_ASSESSMENT_SECTIONS.filter((s) => s.type !== "single-select" && isSectionVisible(s) && isSectionActive(s));
  const totalItems = visibleSections.reduce((sum, s) => sum + (s.items?.length || 0), 0);
  const totalChecked = visibleSections.reduce((sum, s) => sum + (s.items?.filter((i) => form.checked[i.id]) || []).length, 0);
  const overallProgress = totalItems > 0 ? Math.round(((totalChecked + (form.resultSelection ? 1 : 0)) / (totalItems + 1)) * 100) : 0;

  const getSectionProgress = (section: ChecklistSection) => {
    if (!section.items) return { checked: 0, total: 0 };
    const total = section.items.length;
    const checked = section.items.filter((i) => form.checked[i.id]).length;
    return { checked, total };
  };

  // Validation
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.meta.propertyName.trim()) errs.push("Property name is required");
    if (!form.meta.inspectorName.trim()) errs.push("Inspector name is required");
    if (!form.meta.inspectionDate) errs.push("Inspection date is required");

    visibleSections.forEach((section) => {
      if (!isSectionActive(section)) return;
      section.items?.forEach((item) => {
        if (!form.checked[item.id]) return;
        if (item.photoRequired) {
          const photos = form.photos[item.id] || [];
          if (photos.length === 0) errs.push(`"${item.label}" requires at least 1 photo`);
          if (item.minPhotos && photos.length < item.minPhotos) errs.push(`"${item.label}" requires at least ${item.minPhotos} photos (has ${photos.length})`);
        }
      });
    });

    if (!form.resultSelection) {
      errs.push("Inspection result selection is required");
    } else {
      const resultPhotos = form.resultPhotos[form.resultSelection] || [];
      if (resultPhotos.length === 0) errs.push("At least 1 photo is required for the inspection result");
    }
    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setSubmitting(true);

    try {
      const assessmentId = crypto.randomUUID();
      const userId = user!.id;
      const allPhotoPaths: string[] = [];

      // Upload item photos
      for (const [itemId, photos] of Object.entries(form.photos)) {
        for (const photo of photos) {
          const path = `${userId}/${assessmentId}/${itemId}/${photo.id}.jpg`;
          const { error } = await supabase.storage.from("hail-assessment-photos").upload(path, photo.file, { contentType: "image/jpeg" });
          if (error) throw error;
          allPhotoPaths.push(path);
        }
      }

      // Upload result photos
      for (const [optionId, photos] of Object.entries(form.resultPhotos)) {
        for (const photo of photos) {
          const path = `${userId}/${assessmentId}/result-${optionId}/${photo.id}.jpg`;
          const { error } = await supabase.storage.from("hail-assessment-photos").upload(path, photo.file, { contentType: "image/jpeg" });
          if (error) throw error;
          allPhotoPaths.push(path);
        }
      }

      // Build form_data JSONB
      const resultSection = HAIL_ASSESSMENT_SECTIONS.find((s) => s.type === "single-select");
      const selectedOption = resultSection?.options?.find((o) => o.id === form.resultSelection);

      const formData = {
        checked: form.checked,
        notes: form.notes,
        docLinks: form.docLinks,
        applicability: form.applicability,
        resultDocLinks: form.resultDocLinks,
        resultNotes: form.resultNotes,
        photoMap: Object.fromEntries(
          Object.entries(form.photos).map(([k, v]) => [k, v.map((p) => `${userId}/${assessmentId}/${k}/${p.id}.jpg`)])
        ),
        resultPhotoMap: Object.fromEntries(
          Object.entries(form.resultPhotos).map(([k, v]) => [k, v.map((p) => `${userId}/${assessmentId}/result-${k}/${p.id}.jpg`)])
        ),
      };

      const { error: insertError } = await supabase.from("commercial_hail_assessments").insert({
        id: assessmentId,
        submitted_by: userId,
        property_name: form.meta.propertyName.trim(),
        address: form.meta.address.trim() || null,
        inspector_name: form.meta.inspectorName.trim(),
        inspection_date: form.meta.inspectionDate,
        storm_date: form.meta.stormDate || null,
        result: selectedOption?.value || null,
        result_notes: form.resultNotes[form.resultSelection!] || null,
        result_doc_link: form.resultDocLinks[form.resultSelection!] || null,
        has_membrane_roof: form.applicability["section-3"] ?? null,
        has_mod_bitumen: form.applicability["section-4"] ?? null,
        has_metal_roof: form.applicability["section-5"] ?? null,
        interior_accessible: form.applicability["section-8"] ?? null,
        form_data: formData as any,
        photo_paths: allPhotoPaths as any,
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      setSubmittedResult(selectedOption?.value || null);
      toast({ title: "Assessment submitted", description: "Commercial hail assessment saved successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit assessment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const badgeColor = submittedResult === "no_damage" ? "bg-green-600" : submittedResult === "possible_damage" ? "bg-amber-500" : "bg-red-600";
    const badgeLabel = submittedResult === "no_damage" ? "No Damage" : submittedResult === "possible_damage" ? "Possible Damage" : "Confirmed Damage";
    const totalPhotos = Object.values(form.photos).reduce((s, a) => s + a.length, 0) + Object.values(form.resultPhotos).reduce((s, a) => s + a.length, 0);

    return (
      <div className="p-6 max-w-3xl mx-auto text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
        <h1 className="text-2xl font-bold text-foreground">Assessment Submitted</h1>
        <div className="space-y-2">
          <p className="text-muted-foreground">{form.meta.propertyName}</p>
          <Badge className={`${badgeColor} text-white`}>{badgeLabel}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-sm">
          <div><p className="font-bold text-foreground">{totalChecked}</p><p className="text-muted-foreground">Items Checked</p></div>
          <div><p className="font-bold text-foreground">{totalPhotos}</p><p className="text-muted-foreground">Photos</p></div>
          <div><p className="font-bold text-foreground">{visibleSections.length}</p><p className="text-muted-foreground">Sections</p></div>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline">← Back to Tools</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tools
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commercial Roof Hail Assessment</h1>
        <p className="text-sm text-muted-foreground">Structured inspection checklist with photo documentation</p>
      </div>

      {/* Overall Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium text-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertTriangle className="h-4 w-4" /> Please fix the following errors:
          </div>
          <ul className="text-sm text-destructive list-disc list-inside">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Meta */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Property Name *</Label>
            <Input value={form.meta.propertyName} onChange={(e) => setMeta("propertyName", e.target.value)} placeholder="Commercial property name" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.meta.address} onChange={(e) => setMeta("address", e.target.value)} placeholder="Street address" />
          </div>
          <div className="space-y-1.5">
            <Label>Inspector Name *</Label>
            <Input value={form.meta.inspectorName} onChange={(e) => setMeta("inspectorName", e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Inspection Date *</Label>
            <Input type="date" value={form.meta.inspectionDate} onChange={(e) => setMeta("inspectionDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Storm Date</Label>
            <Input type="date" value={form.meta.stormDate} onChange={(e) => setMeta("stormDate", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {HAIL_ASSESSMENT_SECTIONS.map((section) => {
        if (section.type === "single-select") return <ResultSection key={section.id} section={section} form={form} setForm={setForm} handlePhotos={handlePhotos} removeResultPhoto={removeResultPhoto} setResultDocLink={setResultDocLink} setResultNote={setResultNote} fileInputRefs={fileInputRefs} />;

        const visible = isSectionVisible(section);
        const active = isSectionActive(section);
        const hasApplicability = !!section.applicabilityQuestion;
        const hasDependency = !!section.dependsOn;

        // If dependsOn and parent not active, hide entirely
        if (hasDependency && !active) return null;

        const progress = getSectionProgress(section);
        const progressPct = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

        return (
          <div key={section.id} className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Applicability toggle */}
            {hasApplicability && (
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <p className="text-sm text-foreground">{section.applicabilityQuestion}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{form.applicability[section.id] === true ? "Yes" : form.applicability[section.id] === false ? "No" : "—"}</span>
                  <Switch checked={form.applicability[section.id] === true} onCheckedChange={(v) => setApplicability(section.id, v)} />
                </div>
              </div>
            )}

            <Collapsible open={openSections[section.id] ?? false} onOpenChange={() => toggleSection(section.id)}>
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-xs font-bold text-muted-foreground">§{section.sectionNumber}</span>
                  <span className="font-medium text-foreground text-sm">{section.title}</span>
                  {section.optional && <Badge variant="outline" className="text-xs">Optional</Badge>}
                  {active && section.items && (
                    <Badge variant="secondary" className="text-xs">{progress.checked}/{progress.total}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {active && section.items && <Progress value={progressPct} className="w-20 h-1.5" />}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                {(!hasApplicability || active) && section.items && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {section.items.map((item) => (
                      <ItemRow key={item.id} item={item} form={form} toggleChecked={toggleChecked} handlePhotos={handlePhotos} removePhoto={removePhoto} setDocLink={setDocLink} setNote={setNote} fileInputRefs={fileInputRefs} />
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading photos…</> : "Submit Assessment"}
        </Button>
      </div>
    </div>
  );
}

// ----- Sub-components -----

function ItemRow({ item, form, toggleChecked, handlePhotos, removePhoto, setDocLink, setNote, fileInputRefs }: {
  item: ChecklistItem; form: FormState; toggleChecked: (id: string) => void;
  handlePhotos: (id: string, files: FileList | null, isResult?: boolean) => void;
  removePhoto: (itemId: string, photoId: string) => void;
  setDocLink: (itemId: string, value: string) => void;
  setNote: (itemId: string, value: string) => void;
  fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  const checked = form.checked[item.id] ?? false;
  const photos = form.photos[item.id] || [];
  const docLink = form.docLinks[item.id] || "";
  const note = form.notes[item.id] || "";

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Checkbox checked={checked} onCheckedChange={() => toggleChecked(item.id)} className="mt-0.5" />
        <div className="flex-1">
          <span className="text-sm text-foreground">{item.label}</span>
          {item.requiresScale && <Badge className="ml-2 bg-amber-500/20 text-amber-700 border-amber-300 text-xs">📏 Scale required</Badge>}
          {item.photoHint && checked && <p className="text-xs text-muted-foreground mt-0.5">{item.photoHint}</p>}
        </div>
      </div>

      {checked && (
        <div className="ml-6 space-y-2">
          {/* Photos */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{item.photoLabel} {item.photoRequired && "*"}</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative group w-16 h-16 rounded border border-border overflow-hidden">
                  <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(item.id, p.id)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center">{p.sizeMB}MB</span>
                </div>
              ))}
              <button
                onClick={() => fileInputRefs.current[item.id]?.click()}
                className="w-16 h-16 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
              </button>
              <input
                ref={(el) => { fileInputRefs.current[item.id] = el; }}
                type="file"
                accept="image/*"
                multiple={item.multiPhoto}
                className="hidden"
                onChange={(e) => handlePhotos(item.id, e.target.files)}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Compressed to 75% JPEG quality</p>
          </div>

          {/* Doc Link */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Google Doc / Drive Link</Label>
            <div className="flex gap-2">
              <Input value={docLink} onChange={(e) => setDocLink(item.id, e.target.value)} placeholder="Paste Google Doc / Drive link for videos or large files…" className="text-xs h-8" />
              {docLink && (
                <a href={docLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-primary hover:underline shrink-0">
                  Open <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={note} onChange={(e) => setNote(item.id, e.target.value)} rows={2} placeholder="Optional notes…" className="text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}

function ResultSection({ section, form, setForm, handlePhotos, removeResultPhoto, setResultDocLink, setResultNote, fileInputRefs }: {
  section: ChecklistSection; form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  handlePhotos: (id: string, files: FileList | null, isResult?: boolean) => void;
  removeResultPhoto: (optionId: string, photoId: string) => void;
  setResultDocLink: (optionId: string, value: string) => void;
  setResultNote: (optionId: string, value: string) => void;
  fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  const resultColors: Record<string, string> = {
    no_damage: "border-green-500 bg-green-500/10",
    possible_damage: "border-amber-500 bg-amber-500/10",
    confirmed_damage: "border-red-500 bg-red-500/10",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground">§{section.sectionNumber}</span>
          <span className="font-medium text-foreground text-sm">{section.title} *</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {section.options?.map((option) => {
          const selected = form.resultSelection === option.id;
          const photos = form.resultPhotos[option.id] || [];
          const docLink = form.resultDocLinks[option.id] || "";
          const note = form.resultNotes[option.id] || "";

          return (
            <div
              key={option.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${selected ? resultColors[option.value] : "border-border hover:border-muted-foreground/40"}`}
              onClick={() => setForm((f) => ({ ...f, resultSelection: option.id }))}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? "border-current" : "border-muted-foreground/40"}`}>
                  {selected && <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <span className="font-medium text-sm text-foreground">{option.label}</span>
              </div>

              {selected && (
                <div className="mt-3 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {/* Photos */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{option.photoLabel} *</Label>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((p) => (
                        <div key={p.id} className="relative group w-16 h-16 rounded border border-border overflow-hidden">
                          <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                          <button onClick={() => removeResultPhoto(option.id, p.id)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center">{p.sizeMB}MB</span>
                        </div>
                      ))}
                      <button
                        onClick={() => fileInputRefs.current[`result-${option.id}`]?.click()}
                        className="w-16 h-16 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                      >
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <input
                        ref={(el) => { fileInputRefs.current[`result-${option.id}`] = el; }}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotos(option.id, e.target.files, true)}
                      />
                    </div>
                  </div>

                  {/* Doc Link */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Google Doc / Drive Link</Label>
                    <div className="flex gap-2">
                      <Input value={docLink} onChange={(e) => setResultDocLink(option.id, e.target.value)} placeholder="Paste link…" className="text-xs h-8" />
                      {docLink && (
                        <a href={docLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-primary hover:underline shrink-0">
                          Open <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Summary Notes</Label>
                    <Textarea value={note} onChange={(e) => setResultNote(option.id, e.target.value)} rows={2} placeholder="Result summary notes…" className="text-xs" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
