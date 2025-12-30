import { ChevronDown } from "lucide-react";

export function SectionArrow() {
  return (
    <div className="relative py-8 flex justify-center">
      {/* Simple red arrow pointing down */}
      <div className="flex flex-col items-center gap-1 animate-bounce">
        <ChevronDown className="w-8 h-8 text-accent" strokeWidth={3} />
        <ChevronDown className="w-8 h-8 text-accent/60 -mt-5" strokeWidth={3} />
        <ChevronDown className="w-8 h-8 text-accent/30 -mt-5" strokeWidth={3} />
      </div>
    </div>
  );
}