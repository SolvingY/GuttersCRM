import { Search, FileText, FileCheck, Package, Wrench, ClipboardCheck, Receipt, Award } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "In-Depth Inspection",
    description: "Our Next Gen Certified Commercial Inspector conducts a comprehensive 40-point inspection using infrared camera technology to identify hidden damage, moisture intrusion, and structural concerns invisible to the naked eye.",
  },
  {
    icon: FileText,
    title: "Insurance & Scope Development",
    description: "If insurance is covering the project, we start the supplement process immediately. We schedule inspections with insurance companies while building a detailed scope of work to submit for maximum claim value.",
  },
  {
    icon: FileCheck,
    title: "Approval & Payment Schedule",
    description: "After the insurance inspection, if approved, we move forward defining the complete scope of work and establishing a clear payment schedule that works for your business.",
  },
  {
    icon: Package,
    title: "Final Scope & Material Order",
    description: "We finalize the scope of work and order premium commercial roofing materials. All products are specified to meet manufacturer requirements and your building's unique needs.",
  },
  {
    icon: Wrench,
    title: "Project Build",
    description: "Our experienced commercial crews execute the installation with minimal disruption to your business operations. We maintain a clean, safe work site and coordinate around your schedule.",
  },
  {
    icon: ClipboardCheck,
    title: "Quality Control Inspection",
    description: "Before completion, our quality control team conducts manufacturer verification and company inspection to ensure every detail meets specifications and our high standards.",
  },
  {
    icon: Receipt,
    title: "Final Supplements & COI",
    description: "We submit any additional supplements to insurance for remaining work discovered during installation and send the Certificate of Insurance for payment processing.",
  },
  {
    icon: Award,
    title: "Warranty & Completion",
    description: "Upon collecting final payment, we provide the building owner with comprehensive warranty documentation covering materials and workmanship for lasting peace of mind.",
  },
];

export function CommercialProcessSteps() {
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h4 className="text-2xl font-heading uppercase text-center mb-8 text-accent">
        The Next Gen Commercial Process
      </h4>
      
      {/* Timeline Container */}
      <div className="relative">
        {/* Horizontal line - hidden on mobile, visible on larger screens */}
        <div className="hidden lg:block absolute top-6 left-0 right-0 h-0.5 bg-accent/30" />
        
        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
