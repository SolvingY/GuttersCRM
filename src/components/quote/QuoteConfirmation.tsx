import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Phone } from "lucide-react";

interface QuoteConfirmationProps {
  referenceNumber: string;
  serviceType: string;
  email: string;
}

const serviceLabels: Record<string, string> = {
  commercial: "Commercial Roofing",
  residential: "Residential Roofing",
  gutters: "Gutters & Gutter Protection",
  repair: "Repair Work",
};

export function QuoteConfirmation({ referenceNumber, serviceType, email }: QuoteConfirmationProps) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-accent" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-3xl uppercase">Quote Request Submitted!</h2>
        <p className="text-muted-foreground">Thank you for choosing Next Generation Roofing!</p>
      </div>

      <div className="bg-secondary rounded-lg p-6 max-w-md mx-auto space-y-3 text-left">
        <p className="text-sm">
          <span className="text-muted-foreground">Service requested:</span>{" "}
          <span className="font-medium">{serviceLabels[serviceType] || serviceType}</span>
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Confirmation sent to:</span>{" "}
          <span className="font-medium">{email}</span>
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Reference #:</span>{" "}
          <span className="font-heading font-bold text-accent">{referenceNumber}</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto text-left space-y-2">
        <h3 className="font-heading text-lg uppercase">What happens next?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            Our team will review your request
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            We'll contact you within 24 hours
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            We'll schedule a free inspection
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <a href="tel:4057248092">
          <Button variant="outline" className="gap-2">
            <Phone className="w-4 h-4" />
            (405) 724-8092
          </Button>
        </a>
        <Link to="/">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
