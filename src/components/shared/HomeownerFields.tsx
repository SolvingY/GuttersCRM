import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HomeownerFieldsProps {
  name: string;
  phone: string;
  email: string;
  onChange: (field: "name" | "phone" | "email", value: string) => void;
}

export default function HomeownerFields({ name, phone, email, onChange }: HomeownerFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label className="text-sm">Homeowner Name</Label>
        <Input value={name} onChange={(e) => onChange("name", e.target.value)} placeholder="Full name" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Homeowner Phone</Label>
        <Input value={phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="(555) 555-5555" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Homeowner Email</Label>
        <Input type="email" value={email} onChange={(e) => onChange("email", e.target.value)} placeholder="email@example.com" />
      </div>
    </div>
  );
}
