import { Building2, Home, Droplets, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const serviceOptions = [
  {
    id: "commercial",
    icon: Building2,
    title: "Commercial Roofing",
    description: "Office buildings, warehouses, retail, industrial & multi-family complexes",
  },
  {
    id: "residential",
    icon: Home,
    title: "Residential Roofing",
    description: "Single family homes, townhouses, duplexes & mobile homes",
  },
  {
    id: "gutters",
    icon: Droplets,
    title: "Gutters & Gutter Protection",
    description: "Installation, replacement, repair, guards & cleaning",
  },
  {
    id: "repair",
    icon: Wrench,
    title: "Repair Work",
    description: "Roof repairs, gutter repairs, emergency leak fixes & storm damage",
  },
];

interface ServiceSelectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function ServiceSelection({ value, onChange }: ServiceSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl uppercase mb-2">What service do you need?</h2>
        <p className="text-muted-foreground">Select the type of service you're looking for</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {serviceOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "flex items-start gap-4 p-5 rounded-lg border-2 text-left transition-all hover-lift",
              value === option.id
                ? "border-accent bg-accent/5 shadow-md"
                : "border-border hover:border-accent/50"
            )}
          >
            <div className={cn(
              "p-3 rounded-lg shrink-0",
              value === option.id ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
            )}>
              <option.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg uppercase">{option.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
