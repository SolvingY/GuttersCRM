import { Shield, Target, Award, CheckCircle, ArrowDown } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Growth",
    description: "We continuously improve our skills, processes, and service to deliver the best possible results for our clients.",
  },
  {
    icon: Award,
    title: "Customer Service",
    description: "Every homeowner deserves a partner who communicates clearly and puts their needs first throughout the entire process.",
  },
  {
    icon: Shield,
    title: "Humility",
    description: "We listen, learn, and adapt. Our team approaches every project with an open mind and respect for our customers.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Every project receives our full attention and commitment to quality. We don't cut corners, and we don't settle for 'good enough.'",
  },
  {
    icon: Shield,
    title: "Employee Empowerment",
    description: "Our team members are trained, trusted, and equipped to deliver exceptional results on every job.",
  },
  {
    icon: Target,
    title: "Reputation",
    description: "We believe in building long-term relationships through honest work. Your satisfaction is our greatest advertisement.",
  },
];

const highlights = [
  "Veteran-Operated & Supported",
  "45+ Years Combined Leadership Experience",
  "GAF Certified Contractors",
  "BBB A+ Rating",
  "Licensed & Fully Insured",
  "Insurance Claim Specialists",
];

const goldenCircle = [
  {
    label: "WHY",
    title: "Our Purpose",
    description: "We exist to provide homeowners with trusted roofing solutions built on integrity and insurance expertise. We believe every family deserves a partner who values your peace of mind over profit.",
  },
  {
    label: "HOW",
    title: "Our Approach",
    description: "Through 45+ years of combined leadership experience, NGR-supervised crews, and unwavering commitment to quality. Every decision is guided by our core values of growth, humility, and excellence.",
  },
  {
    label: "WHAT",
    title: "Our Craft",
    description: "Professional residential roofing, turnkey commercial solutions, seamless gutter installations, and expert insurance claim navigation—all delivered with the care your home deserves.",
  },
];

export function AboutSection() {
  return (
    <div className="bg-background">
      {/* Story Section */}
      <div className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-accent mb-4">
              <Shield className="w-5 h-5" />
              <span className="font-heading text-sm uppercase tracking-wider">
                About Us
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
              Built on <span className="text-accent">Service</span>,{" "}
              Dedicated to <span className="text-accent">Excellence</span>
            </h2>
          </div>

          {/* Golden Circle Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="flex flex-col items-center">
              {goldenCircle.map((item, index) => (
                <div key={item.label} className="w-full">
                  <div className="bg-card border border-border rounded-xl p-8 hover:shadow-xl transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Label Badge */}
                      <div className="flex-shrink-0">
                        <span className="inline-block bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading text-2xl uppercase tracking-wider font-bold shadow-lg">
                          {item.label}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="font-heading text-xl uppercase text-foreground mb-3">
                          {item.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow to next */}
                  {index < goldenCircle.length - 1 && (
                    <div className="flex justify-center py-4">
                      <div className="bg-accent/20 p-2 rounded-full">
                        <ArrowDown className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
            </div>
          </div>
          
          {/* Arrow to Core Values - matching other section arrows */}
          <div className="flex justify-center -mt-4 -mb-2">
            <div className="flex flex-col items-center">
              <div className="w-2 h-10 bg-accent/50" />
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[18px] border-t-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="section-padding bg-section-alt">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4 text-accent font-bold">
              Our Core Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These values guide every decision we make and every project we complete.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-background rounded-lg p-8 text-center hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-heading text-2xl uppercase mb-4 text-accent font-bold">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
