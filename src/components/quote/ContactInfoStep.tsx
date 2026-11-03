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
      <p className="text-sm text-muted-foreground">Fields marked * are required.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          {/* Labels, autocomplete and required flags let assistive tech and autofill identify each field (WCAG 1.3.1 / 1.3.5 / 3.3.2) */}
          <Label htmlFor="quote-fullName">Full Name *</Label>
          <Input id="quote-fullName" autoComplete="name" required placeholder="John Smith" value={data.fullName || ""} onChange={(e) => update("fullName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quote-email">Email *</Label>
          <Input id="quote-email" type="email" autoComplete="email" required placeholder="john@example.com" value={data.email || ""} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quote-phone">Phone Number *</Label>
          <Input id="quote-phone" type="tel" autoComplete="tel" required placeholder="(405) 555-1234" value={data.phone || ""} onChange={(e) => update("phone", formatPhone(e.target.value))} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading text-lg uppercase">Property Address</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-streetAddress">Street Address *</Label>
            <Input id="quote-streetAddress" autoComplete="street-address" required placeholder="123 Main St" value={data.streetAddress || ""} onChange={(e) => update("streetAddress", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quote-city">City *</Label>
              <Input id="quote-city" autoComplete="address-level2" required placeholder="Oklahoma City" value={data.city || ""} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-state">State</Label>
              <Select value={data.state || "Oklahoma"} onValueChange={(v) => update("state", v)}>
                <SelectTrigger id="quote-state"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-zipCode">Zip Code *</Label>
              <Input id="quote-zipCode" autoComplete="postal-code" inputMode="numeric" required placeholder="73101" value={data.zipCode || ""} onChange={(e) => update("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))} />
            </div>
          </div>
        </div>
      </div>

      <fieldset className="space-y-2">
        <Label asChild><legend>Best Time to Contact (select all that apply)</legend></Label>
        <div className="grid grid-cols-2 gap-2">
          {contactTimes.map((time) => (
            <label key={time} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors">
              <Checkbox checked={(data.bestContactTime || []).includes(time)} onCheckedChange={() => toggleTime(time)} />
              <span className="text-sm">{time}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="quote-referralSource">How did you hear about us?</Label>
        <Select value={data.referralSource || ""} onValueChange={(v) => update("referralSource", v)}>
          <SelectTrigger id="quote-referralSource"><SelectValue placeholder="Select one" /></SelectTrigger>
          <SelectContent>
            {referralSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
