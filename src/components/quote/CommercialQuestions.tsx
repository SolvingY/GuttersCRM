import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommercialQuestionsProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const buildingTypes = ["Office Building", "Warehouse", "Retail Store", "Industrial Facility", "Multi-Family Complex", "Other"];
const sqFootageOptions = ["Less than 5,000 sq ft", "5,000 - 10,000 sq ft", "10,000 - 25,000 sq ft", "25,000 - 50,000 sq ft", "50,000+ sq ft"];
const roofTypes = ["TPO (Thermoplastic Polyolefin)", "EPDM (Rubber)", "Modified Bitumen", "Built-Up Roof (BUR)", "Metal", "Shingle", "Don't Know"];
const jobTypeOptions = ["Retail (Out of Pocket)", "Insurance Claim"];
const roofAgeOptions = ["Less than 5 years", "5-10 years", "10-15 years", "15-20 years", "20+ years", "Don't Know"];
const needOptions = ["New Roof Installation", "Roof Replacement", "Roof Repair", "Inspection/Assessment", "Maintenance Plan"];
const timelineOptions = ["Urgent (within 1 week)", "Soon (1-4 weeks)", "Flexible (1-3 months)", "Planning ahead (3+ months)"];

export function CommercialQuestions({ data, onChange }: CommercialQuestionsProps) {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });
  const toggleNeed = (need: string) => {
    const current: string[] = data.needs || [];
    update("needs", current.includes(need) ? current.filter((n: string) => n !== need) : [...current, need]);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl uppercase">Commercial Roofing Details</h2>

      <div className="space-y-2">
        <Label>Building Type</Label>
        <Select value={data.buildingType || ""} onValueChange={(v) => update("buildingType", v)}>
          <SelectTrigger><SelectValue placeholder="Select building type" /></SelectTrigger>
          <SelectContent>
            {buildingTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Approximate Square Footage</Label>
        <div className="space-y-2">
          {sqFootageOptions.map((opt) => (
            <label key={opt} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", data.squareFootage === opt ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <input type="radio" name="sqFootage" className="sr-only" checked={data.squareFootage === opt} onChange={() => update("squareFootage", opt)} />
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", data.squareFootage === opt ? "border-accent" : "border-muted-foreground")}>
                {data.squareFootage === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Current Roof Type</Label>
        <Select value={data.roofType || ""} onValueChange={(v) => update("roofType", v)}>
          <SelectTrigger><SelectValue placeholder="Select roof type" /></SelectTrigger>
          <SelectContent>
            {roofTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Retail or Insurance */}
      <div className="space-y-2">
        <Label>Retail or Insurance Job?</Label>
        <div className="flex gap-3">
          {jobTypeOptions.map((opt) => (
            <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.jobType === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="jobType" className="sr-only" checked={data.jobType === opt} onChange={() => update("jobType", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Active Insurance Claim — shown when Insurance Claim selected */}
      {data.jobType === "Insurance Claim" && (
        <div className="space-y-2">
          <Label>Do you have an active insurance claim?</Label>
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.activeClaim === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
                <input type="radio" name="activeClaim" className="sr-only" checked={data.activeClaim === opt} onChange={() => update("activeClaim", opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Insurance Company — shown when Insurance Claim selected */}
      {data.jobType === "Insurance Claim" && (
        <div className="space-y-2">
          <Label>Insurance Company</Label>
          <Input placeholder="e.g., State Farm, Allstate..." value={data.insuranceCompany || ""} onChange={(e) => update("insuranceCompany", e.target.value)} />
        </div>
      )}

      {/* Roof Age */}
      <div className="space-y-2">
        <Label>Roof Age</Label>
        <Select value={data.roofAge || ""} onValueChange={(v) => update("roofAge", v)}>
          <SelectTrigger><SelectValue placeholder="Select roof age" /></SelectTrigger>
          <SelectContent>
            {roofAgeOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Routine Maintenance */}
      <div className="space-y-2">
        <Label>Has routine maintenance been done on this roof?</Label>
        <div className="flex gap-3">
          {["Yes", "No", "Not Sure"].map((opt) => (
            <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.routineMaintenance === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="routineMaintenance" className="sr-only" checked={data.routineMaintenance === opt} onChange={() => update("routineMaintenance", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>What do you need? (select all that apply)</Label>
        <div className="space-y-2">
          {needOptions.map((need) => (
            <label key={need} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors">
              <Checkbox checked={(data.needs || []).includes(need)} onCheckedChange={() => toggleNeed(need)} />
              <span className="text-sm">{need}</span>
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
        <Textarea placeholder="Any specific concerns, leaks, or requirements?" value={data.additionalDetails || ""} onChange={(e) => update("additionalDetails", e.target.value)} />
      </div>
    </div>
  );
}
