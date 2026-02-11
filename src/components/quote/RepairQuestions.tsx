import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RepairQuestionsProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const repairTargets = ["Roof", "Gutters", "Both", "Not Sure"];
const urgencyOptions = ["Emergency (active leak/damage)", "Urgent (within a few days)", "Soon (within 1-2 weeks)", "Not urgent"];
const propertyTypes = ["Residential", "Commercial"];
const noticedOptions = ["Today", "This week", "This month", "Longer ago"];

export function RepairQuestions({ data, onChange }: RepairQuestionsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });

  const photos: string[] = data.photoUrls || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      toast({ title: "Too many files", description: "Maximum 5 photos allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB`, variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["jpg", "jpeg", "png"].includes(ext || "")) {
        toast({ title: "Invalid file type", description: `${file.name} must be JPG or PNG`, variant: "destructive" });
        continue;
      }

      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("quote-photos").upload(path, file);

      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("quote-photos").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    update("photoUrls", [...photos, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    update("photoUrls", photos.filter((_, i) => i !== index));
  };

  const wordCount = (data.issueDescription || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl uppercase">Repair Details</h2>

      <div className="space-y-2">
        <Label>What needs repair?</Label>
        <div className="grid grid-cols-2 gap-3">
          {repairTargets.map((opt) => (
            <label key={opt} className={cn("text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.repairTarget === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="repairTarget" className="sr-only" checked={data.repairTarget === opt} onChange={() => update("repairTarget", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Urgency</Label>
        <div className="space-y-2">
          {urgencyOptions.map((opt) => (
            <label key={opt} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", data.urgency === opt ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <input type="radio" name="urgency" className="sr-only" checked={data.urgency === opt} onChange={() => update("urgency", opt)} />
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", data.urgency === opt ? "border-accent" : "border-muted-foreground")}>
                {data.urgency === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Property Type</Label>
        <div className="flex gap-3">
          {propertyTypes.map((opt) => (
            <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.propertyType === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="propertyType" className="sr-only" checked={data.propertyType === opt} onChange={() => update("propertyType", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Describe the Issue *</Label>
        <Textarea
          placeholder="e.g., Leak in bedroom ceiling, missing shingles after storm, gutter detached from house"
          value={data.issueDescription || ""}
          onChange={(e) => update("issueDescription", e.target.value)}
          className="min-h-[120px]"
        />
        <p className={cn("text-xs", wordCount >= 20 ? "text-muted-foreground" : "text-destructive")}>
          {wordCount}/20 words minimum
        </p>
      </div>

      <div className="space-y-2">
        <Label>When did you notice the issue?</Label>
        <div className="grid grid-cols-2 gap-3">
          {noticedOptions.map((opt) => (
            <label key={opt} className={cn("text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.noticedWhen === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="noticedWhen" className="sr-only" checked={data.noticedWhen === opt} onChange={() => update("noticedWhen", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Photos of the damage (optional, max 5)</Label>
        <div className="space-y-3">
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {photos.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload photos"}</span>
              <input type="file" accept="image/jpeg,image/png" multiple className="sr-only" onChange={handleFileUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
