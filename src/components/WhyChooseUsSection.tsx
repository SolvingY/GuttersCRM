import { useState } from "react";
import { MessageSquare, ClipboardList, Hammer, CheckCircle, Shield, Phone, ChevronDown } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "A Straightforward Conversation",
    description: "We start with an honest discussion about your roofing needs, concerns, and goals. No high-pressure sales tactics—just a real conversation about how we can help protect your home or business.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Detailed Inspection & Planning",
    description: "Our certified inspectors thoroughly document your roof's condition with photos and detailed reports. We create a comprehensive scope of work, outline timelines, and discuss material options tailored to your property.",
  },
  {
    number: "03",
    icon: Shield,
    title: "Insurance Advocacy & Support",
    description: "If you're filing an insurance claim, we fight for every dollar you deserve. We meet with adjusters, document all damage, and handle the complex paperwork so you can focus on what matters.",
  },
  {
    number: "04",
    icon: Hammer,
    title: "Clean, Professional Execution",
    description: "Our NGR-supervised crews work with precision and respect for your property. We maintain a clean, organized jobsite and communicate throughout the entire installation process.",
  },
  {
    number: "05",
    icon: CheckCircle,
    title: "Quality Control & Walkthrough",
    description: "Before we consider the job complete, our quality control team inspects every detail. We walk through the finished work with you and confirm everything meets our high standards and your expectations.",
  },
  {
    number: "06",
    icon: Shield,
    title: "Warranty & Ongoing Support",
    description: "Your new roof is registered with manufacturer warranties and backed by our workmanship guarantee. We stand behind our work and are always available if you have questions down the road.",
  },
];

export function WhyChooseUsSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="why-choose-us" className="section-padding bg-secondary/30">
      <div className="container-custom">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4 text-accent font-bold">
            Why Choose Us
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            We believe that great outcomes start with a great process. Whether we're replacing a residential roof or restoring a commercial property, our approach stays the same: be honest, be thorough, and do the work right.
          </p>
        </div>

        {/* The Next Gen Experience Dropdown */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Dropdown Header */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-heading uppercase text-foreground">
                    The Next Gen <span className="text-accent">Experience</span>
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Click to see our step-by-step process
                  </p>
                </div>
              </div>
              <ChevronDown 
                className={`w-6 h-6 text-accent transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expandable Content */}
            <div
              className={`overflow-hidden transition-all duration-500 ${
                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-6 md:p-8 pt-0 border-t border-border">
                <p className="text-muted-foreground mb-6">
                  From the first phone call to the final walkthrough, every step is designed to give you confidence, clarity, and a roof that lasts.
                </p>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {steps.map((step) => (
                    <div 
                      key={step.number}
                      className="bg-primary/10 border border-border/50 rounded-lg p-4 hover:bg-primary/20 transition-colors text-center"
                    >
                      <div className="flex flex-col items-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                          <span className="text-accent-foreground font-bold text-sm">
                            {step.number}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <step.icon className="w-4 h-4 text-accent" />
                          <h4 className="font-heading uppercase text-sm text-foreground">
                            {step.title}
                          </h4>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-8">
                  <a
                    href="tel:+14057248092"
                    className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading uppercase text-sm tracking-wider hover:bg-accent/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Us Today
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
