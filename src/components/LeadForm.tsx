import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const serviceOptions = [
  "Residential Roofing",
  "Commercial Roofing",
  "Gutters",
  "Storm Damage & Insurance",
  "Free Inspection",
];

export function LeadForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    service: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Request Submitted!",
      description: "We'll contact you within 24 hours to schedule your free inspection.",
    });

    setFormData({ name: "", phone: "", address: "", service: "" });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Your Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="bg-background/90 border-border h-12"
        />
      </div>
      <div>
        <Input
          type="tel"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          className="bg-background/90 border-border h-12"
        />
      </div>
      <div>
        <Input
          type="text"
          placeholder="Property Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          className="bg-background/90 border-border h-12"
        />
      </div>
      <div>
        <select
          value={formData.service}
          onChange={(e) => setFormData({ ...formData, service: e.target.value })}
          required
          className="w-full h-12 px-3 bg-background/90 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select Service Type</option>
          {serviceOptions.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="submit"
        variant="cta"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          "Submitting..."
        ) : (
          <>
            <Send className="w-4 h-4" />
            Request Free Inspection
          </>
        )}
      </Button>
    </form>
  );
}
