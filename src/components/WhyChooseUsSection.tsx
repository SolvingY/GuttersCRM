import { MessageSquare, ClipboardList, Hammer, CheckCircle, Shield, Phone } from "lucide-react";

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
  return (
    <section id="why-choose-us" className="section-padding bg-secondary/30">
      <div className="container-custom">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            Why Choose Us
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            We believe that great outcomes start with a great process. Whether we're replacing a residential roof or restoring a commercial property, our approach stays the same: be honest, be thorough, and do the work right.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Sticky Title */}
          <div className="lg:sticky lg:top-32 lg:h-fit">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading uppercase text-foreground mb-6">
              The Next Gen<br />
              <span className="text-accent">Experience</span>
            </h3>
            <p className="text-muted-foreground max-w-md">
              From the first phone call to the final walkthrough, every step is designed to give you confidence, clarity, and a roof that lasts.
            </p>
            <a
              href="tel:+14057248092"
              className="inline-flex items-center gap-2 mt-8 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading uppercase text-sm tracking-wider hover:bg-accent/90 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Us Today
            </a>
          </div>

          {/* Right Column - Steps */}
          <div className="space-y-4">
            {steps.map((step) => (
              <div 
                key={step.number}
                className="bg-card border border-border rounded-lg p-5 md:p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-accent-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-accent font-heading text-sm">{step.number}</span>
                      <h4 className="font-heading uppercase text-base text-foreground">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
