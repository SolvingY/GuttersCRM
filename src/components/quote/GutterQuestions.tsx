import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GutterQuestionsProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const propertyTypes = ["Residential", "Commercial"];
const gutterTypes = ["K-Style (Standard)", "Half-Round", "Box Gutters", "Fascia Gutters", "Don't Know / Not Sure"];
const needOptions = ["New Gutter Installation", "Gutter Replacement", "Gutter Repair", "Gutter Protection/Guards", "Gutter Cleaning", "Downspout Work"];
const footageOptions = ["Less than 100 ft", "100-200 ft", "200-300 ft", "300-500 ft", "500+ ft", "Not Sure"];
const issueOptions = ["Overflowing gutters", "Sagging/pulling away from house", "Rust/corrosion", "Frequent clogging", "Leaking seams", "No gutters currently", "Other"];
const timelineOptions = ["Urgent (within 1 week)", "Soon (1-4 weeks)", "Flexible (1-3 months)", "Planning ahead (3+ months)"];

export function GutterQuestions({ data, onChange }: GutterQuestionsProps) {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });
  const toggleList = (key: string, item: string) => {
    const current: string[] = data[key] || [];
    update(key, current.includes(item) ? current.filter((i: string) => i !== item) : [...current, item]);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl uppercase">Gutter Service Details</h2>

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

      {/* Gutter Type */}
      <div className="space-y-2">
        <Label>Gutter Type</Label>
        <div className="space-y-2">
          {gutterTypes.map((opt) => (
            <label key={opt} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", data.gutterType === opt ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <input type="radio" name="gutterType" className="sr-only" checked={data.gutterType === opt} onChange={() => update("gutterType", opt)} />
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", data.gutterType === opt ? "border-accent" : "border-muted-foreground")}>
                {data.gutterType === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Insurance Claim */}
      <div className="space-y-2">
        <Label>Is this an insurance-related claim?</Label>
        <div className="flex gap-3">
          {["Yes", "No"].map((opt) => (
            <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.insuranceClaim === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="insuranceClaim" className="sr-only" checked={data.insuranceClaim === opt} onChange={() => update("insuranceClaim", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Insurance Company — conditional */}
      {data.insuranceClaim === "Yes" && (
        <div className="space-y-2">
          <Label>Insurance Company</Label>
          <Input placeholder="e.g., State Farm, Allstate..." value={data.insuranceCompany || ""} onChange={(e) => update("insuranceCompany", e.target.value)} />
        </div>
      )}

      <div className="space-y-2">
        <Label>What do you need? (select all that apply)</Label>
        <div className="space-y-2">
          {needOptions.map((need) => (
            <label key={need} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors">
              <Checkbox checked={(data.needs || []).includes(need)} onCheckedChange={() => toggleList("needs", need)} />
              <span className="text-sm">{need}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Approximate Linear Footage</Label>
        <div className="space-y-2">
          {footageOptions.map((opt) => (
            <label key={opt} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", data.linearFootage === opt ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <input type="radio" name="linearFootage" className="sr-only" checked={data.linearFootage === opt} onChange={() => update("linearFootage", opt)} />
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", data.linearFootage === opt ? "border-accent" : "border-muted-foreground")}>
                {data.linearFootage === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Current Issues (select all that apply)</Label>
        <div className="space-y-2">
          {issueOptions.map((issue) => (
            <label key={issue} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors">
              <Checkbox checked={(data.issues || []).includes(issue)} onCheckedChange={() => toggleList("issues", issue)} />
              <span className="text-sm">{issue}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeline</Label>
        <div className="space-y-2">
          {timelineOptions.map((opt) => (
            <label key={opt} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", data.timeline === opt ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <input type="radio" name="timeline" className="sr-only" checked={data.timeline === opt} onChange={() => update("timeline", opt)} />
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", data.timeline === opt ? "border-accent" : "border-muted-foreground")}>
                {data.timeline === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Additional Details (optional)</Label>
        <Textarea placeholder="Tell us more about your project..." value={data.additionalDetails || ""} onChange={(e) => update("additionalDetails", e.target.value)} />
      </div>
    </div>
  );
}
