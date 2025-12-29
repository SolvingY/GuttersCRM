import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Shield, Target, Award, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-primary-foreground">
          <div className="container-custom px-4">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-accent mb-4">
                <Shield className="w-5 h-5" />
                <span className="font-heading text-sm uppercase tracking-wider">
                  About Us
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase mb-6">
                Built on <span className="text-accent">Service</span>,{" "}
                Dedicated to <span className="text-accent">Excellence</span>
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                Next Generation Roofing is a Veteran-Operated & Supported roofing company proudly serving Oklahoma City and the surrounding metro area.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-heading uppercase">
                  Our Story
                </h2>
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
        </section>

        {/* Values Section */}
        <section className="section-padding bg-section-alt">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
                Our Core Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These values guide every decision we make and every project we complete.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
        </section>

        {/* CTA */}
        <section className="section-padding bg-accent text-accent-foreground">
          <div className="container-custom text-center">
            <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
              Ready to Work with Oklahoma's Best?
            </h2>
            <p className="text-accent-foreground/90 mb-8 max-w-2xl mx-auto">
              Experience the Next Generation difference. Schedule your free inspection today.
            </p>
            <Link to="/contact">
              <Button variant="default" size="xl" className="bg-background text-foreground hover:bg-background/90">
                Contact Us Today
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
