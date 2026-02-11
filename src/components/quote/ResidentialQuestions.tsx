import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ResidentialQuestionsProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const propertyTypes = ["Single Family Home", "Townhouse", "Duplex/Multi-Unit", "Mobile Home"];
const homeAges = ["Less than 5 years", "5-10 years", "10-20 years", "20-30 years", "30+ years"];
const roofTypes = ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shake", "Flat Roof", "Don't Know"];
const stories = ["1 Story", "2 Stories", "3+ Stories"];
const needOptions = ["Full Roof Replacement", "Partial Replacement", "Repair", "Inspection", "Storm Damage Assessment"];
const issueOptions = ["Active Leaks", "Missing Shingles", "Storm Damage", "Sagging Areas", "Mold/Moisture Concerns", "Age/Wear", "None - Just Want Assessment"];
const timelineOptions = ["Urgent (within 1 week)", "Soon (1-4 weeks)", "Flexible (1-3 months)", "Planning ahead (3+ months)"];

export function ResidentialQuestions({ data, onChange }: ResidentialQuestionsProps) {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });
  const toggleList = (key: string, item: string) => {
    const current: string[] = data[key] || [];
    update(key, current.includes(item) ? current.filter((i: string) => i !== item) : [...current, item]);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl uppercase">Residential Roofing Details</h2>

      <div className="space-y-2">
        <Label>Property Type</Label>
        <div className="space-y-2">
          {propertyTypes.map((opt) => (
            <label key={opt} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", data.propertyType === opt ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <input type="radio" name="propertyType" className="sr-only" checked={data.propertyType === opt} onChange={() => update("propertyType", opt)} />
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", data.propertyType === opt ? "border-accent" : "border-muted-foreground")}>
                {data.propertyType === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Home Age</Label>
        <Select value={data.homeAge || ""} onValueChange={(v) => update("homeAge", v)}>
          <SelectTrigger><SelectValue placeholder="Select home age" /></SelectTrigger>
          <SelectContent>
            {homeAges.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
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

      <div className="space-y-2">
        <Label>Number of Stories</Label>
        <div className="flex gap-3">
          {stories.map((opt) => (
            <label key={opt} className={cn("flex-1 text-center p-3 rounded-lg border cursor-pointer transition-colors text-sm", data.stories === opt ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50")}>
              <input type="radio" name="stories" className="sr-only" checked={data.stories === opt} onChange={() => update("stories", opt)} />
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
              <Checkbox checked={(data.needs || []).includes(need)} onCheckedChange={() => toggleList("needs", need)} />
              <span className="text-sm">{need}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Known Issues (select all that apply)</Label>
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
