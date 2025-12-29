import { Shield, Target, Award, CheckCircle } from "lucide-react";

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
  "7-Year Workmanship Guarantee",
  "OK House Bill 1940 Compliant",
  "45+ Years Combined Leadership Experience",
  "GAF Certified Contractors",
  "BBB A+ Rating",
  "Licensed & Fully Insured",
  "Insurance Claim Specialists",
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="font-heading text-xl uppercase text-accent mb-2">Why We Exist</h3>
              <p className="text-muted-foreground leading-relaxed">
                We exist to provide Oklahoma residents with trusted roofing solutions built on integrity and high-level insurance expertise. We believe homeowners deserve a partner who values reputation over profit.
              </p>
              <h3 className="font-heading text-xl uppercase text-accent mb-2">How We Do It</h3>
              <p className="text-muted-foreground leading-relaxed">
                By leveraging 45+ years of combined leadership experience, utilizing NGR-supervised crews, and maintaining strict Oklahoma House Bill 1940 compliance.
              </p>
              <h3 className="font-heading text-xl uppercase text-accent mb-2">What We Deliver</h3>
              <p className="text-muted-foreground leading-relaxed">
                Professional residential roofing, turnkey commercial solutions, seamless gutter installations, and expert insurance claim negotiation.
              </p>
            </div>
            <div className="bg-section-alt rounded-lg p-8">
              <h3 className="font-heading text-2xl uppercase mb-6">Why Choose Us?</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="section-padding bg-section-alt">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
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
                <h3 className="font-heading text-2xl uppercase mb-4">{value.title}</h3>
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
