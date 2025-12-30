import { ClipboardCheck, FileText, FileCheck, Package, Wrench, Shield, Search, Receipt, Award } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Inspection",
    description: "Our certified inspectors thoroughly examine your roof for storm damage, wear, and potential issues. We document everything with photos and detailed reports to build your case.",
  },
  {
    icon: FileCheck,
    title: "Insurance & Supplements",
    description: "We meet with your insurance adjuster on-site, handle the complex paperwork, and file any supplements needed. Our team fights to maximize your claim value and ensure every necessary repair is covered.",
  },
  {
    icon: Package,
    title: "Material Order",
    description: "Once approved, we order premium GAF materials matched to your home. We coordinate delivery and staging to minimize disruption to your property.",
  },
  {
    icon: Wrench,
    title: "Project Build",
    description: "Our NGR-supervised crews execute your roof installation with precision and care. We protect your property and maintain a clean, safe work site throughout.",
  },
  {
    icon: ClipboardCheck,
    title: "Quality Control & Final Supplements",
    description: "Our quality control team inspects every detail before completion. Any remaining items discovered during installation are documented and submitted to ensure you receive full compensation.",
  },
  {
    icon: Award,
    title: "Warranty Certified",
    description: "Your new roof is registered with manufacturer warranties and backed by our workmanship guarantee. Enjoy peace of mind knowing you're fully protected.",
  },
];

export function ProcessSteps() {
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h4 className="text-2xl font-heading uppercase text-center mb-8 text-accent">
        The Next Gen Process
      </h4>
      
      {/* Timeline Container */}
      <div className="relative">
        {/* Horizontal line - hidden on mobile, visible on larger screens */}
        <div className="hidden lg:block absolute top-6 left-0 right-0 h-0.5 bg-accent/30" />
        
        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Step Card */}
              <div className="bg-primary/10 backdrop-blur-sm border border-border/50 rounded-lg p-4 h-full hover:bg-primary/20 transition-colors text-center">
                {/* Step Number Circle */}
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-accent-foreground font-bold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <step.icon className="w-4 h-4 text-accent" />
                    <h5 className="font-heading uppercase text-sm text-foreground">
                      {step.title}
                    </h5>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
