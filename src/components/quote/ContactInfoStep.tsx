import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ContactInfoStepProps {
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

const contactTimes = ["Morning (8am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-8pm)", "Anytime"];
const referralSources = ["Google Search", "Facebook", "Instagram", "Referral from friend/family", "Previous customer", "Yard sign", "Door hanger", "Other"];

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

export function ContactInfoStep({ data, onChange }: ContactInfoStepProps) {
  const update = (key: string, value: any) => onChange({ ...data, [key]: value });
  const toggleTime = (time: string) => {
    const current: string[] = data.bestContactTime || [];
    update("bestContactTime", current.includes(time) ? current.filter((t: string) => t !== time) : [...current, time]);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl uppercase">Contact Information</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Full Name *</Label>
          <Input placeholder="John Smith" value={data.fullName || ""} onChange={(e) => update("fullName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" placeholder="john@example.com" value={data.email || ""} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input type="tel" placeholder="(405) 555-1234" value={data.phone || ""} onChange={(e) => update("phone", formatPhone(e.target.value))} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading text-lg uppercase">Property Address</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Street Address *</Label>
            <Input placeholder="123 Main St" value={data.streetAddress || ""} onChange={(e) => update("streetAddress", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input placeholder="Oklahoma City" value={data.city || ""} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={data.state || "Oklahoma"} onValueChange={(v) => update("state", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zip Code *</Label>
              <Input placeholder="73101" value={data.zipCode || ""} onChange={(e) => update("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Best Time to Contact (select all that apply)</Label>
        <div className="grid grid-cols-2 gap-2">
          {contactTimes.map((time) => (
            <label key={time} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors">
              <Checkbox checked={(data.bestContactTime || []).includes(time)} onCheckedChange={() => toggleTime(time)} />
              <span className="text-sm">{time}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>How did you hear about us?</Label>
        <Select value={data.referralSource || ""} onValueChange={(v) => update("referralSource", v)}>
          <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
          <SelectContent>
            {referralSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
