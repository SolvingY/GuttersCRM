import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { Home, Building2, Droplets, Shield, ArrowRight, CheckCircle, Phone } from "lucide-react";

const servicesData = {
  residential: {
    icon: Home,
    title: "Residential Roofing",
    description: "Premium roofing solutions for Oklahoma homes",
    hero: "Protect your family with a roof built to last. Our residential roofing services combine quality materials with expert installation for unmatched durability.",
    features: [
      {
        title: "GAF Shingles",
        description: "As GAF Certified contractors, we offer the full line of GAF roofing products, including Timberline HDZ shingles with industry-leading warranties.",
      },
      {
        title: "Metal Roofing",
        description: "Durable, energy-efficient metal roofing options that can last 50+ years with minimal maintenance.",
      },
      {
        title: "SBS Impact Resistant",
        description: "Modified bitumen shingles designed to withstand Oklahoma's severe weather, including hail and high winds.",
      },
    ],
    benefits: [
      "7-Year Workmanship Guarantee",
      "GAF Certified Installation",
      "Free Storm Damage Inspections",
      "Insurance Claim Assistance",
      "Financing Options Available",
      "Clean Job Site Guarantee",
    ],
  },
  commercial: {
    icon: Building2,
    title: "Commercial Roofing",
    description: "Professional solutions for businesses",
    hero: "Minimize downtime and maximize protection with our commercial roofing services. We understand that your business can't stop for roof repairs.",
    features: [
      {
        title: "TPO Roofing",
        description: "Energy-efficient thermoplastic polyolefin roofing systems ideal for flat and low-slope commercial roofs.",
      },
      {
        title: "Roof Coatings",
        description: "Extend the life of your existing roof with our professional coating services that add protection and reduce energy costs.",
      },
      {
        title: "Flat Roof Systems",
        description: "Complete flat roof installation and repair services using the latest materials and techniques.",
      },
    ],
    benefits: [
      "Minimal Business Disruption",
      "Extended Warranties Available",
      "Preventive Maintenance Programs",
      "Emergency Repair Services",
      "Code Compliance Expertise",
      "Commercial-Grade Materials",
    ],
  },
  gutters: {
    icon: Droplets,
    title: "Gutter Division",
    description: "Complete gutter solutions",
    hero: "Protect your foundation and landscaping with properly functioning gutters. Our seamless gutter systems are custom-fitted to your home.",
    features: [
      {
        title: "Seamless Gutters",
        description: "Custom-fabricated on-site for a perfect fit with no seams to leak or fail over time.",
      },
      {
        title: "Custom Colors",
        description: "Wide selection of colors to match or complement your home's exterior.",
      },
      {
        title: "Gutter Guards",
        description: "Keep debris out and water flowing with our professional gutter guard installation.",
      },
    ],
    benefits: [
      "Custom On-Site Fabrication",
      "20+ Color Options",
      "Lifetime Warranty Available",
      "Downspout Extensions",
      "Proper Pitch Installation",
      "Full System Inspections",
    ],
  },
  "storm-damage": {
    icon: Shield,
    title: "Storm Damage & Insurance",
    description: "Expert claim support",
    hero: "Oklahoma weather can be brutal. When storms damage your roof, we're here to help navigate the entire process from inspection to final repair.",
    features: [
      {
        title: "Free Storm Inspections",
        description: "Comprehensive damage assessment by trained professionals who know what insurance companies look for.",
      },
      {
        title: "Insurance Claim Support",
        description: "We work directly with your insurance company, documenting damage and advocating for full coverage.",
      },
      {
        title: "Emergency Services",
        description: "Rapid response for emergency tarping and temporary repairs to prevent further damage.",
      },
    ],
    benefits: [
      "Free Damage Inspections",
      "Direct Insurance Billing",
      "Claim Documentation Support",
      "Emergency Tarping Available",
      "Full Restoration Services",
      "No Out-of-Pocket Maximization",
    ],
  },
};

export default function ServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const service = servicesData[slug as keyof typeof servicesData];

  if (!service) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-16 text-center">
          <h1 className="text-4xl font-heading">Service Not Found</h1>
          <Link to="/" className="text-accent hover:underline">Return Home</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = service.icon;

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-primary-foreground">
          <div className="container-custom px-4">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-accent mb-4">
                <Icon className="w-5 h-5" />
                <span className="font-heading text-sm uppercase tracking-wider">
                  Our Services
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase mb-6">
                {service.title}
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                {service.hero}
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {service.features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="bg-card border border-border rounded-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <h3 className="font-heading text-xl uppercase mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="section-padding bg-section-alt">
          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-heading uppercase mb-6">
                  Why Choose Us for {service.title}?
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  With over 200 five-star reviews and a 7-year workmanship guarantee, we've earned the trust of Oklahoma homeowners through consistent quality and exceptional service.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/contact">
                    <Button variant="cta" size="lg">
                      Get Free Quote
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <a href="tel:4057248092">
                    <Button variant="outline" size="lg">
                      <Phone className="w-4 h-4" />
                      (405) 724-8092
                    </Button>
                  </a>
                </div>
              </div>
              <div className="bg-background rounded-lg p-8 shadow-lg">
                <h3 className="font-heading text-xl uppercase mb-6">What's Included</h3>
                <ul className="space-y-4">
                  {service.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-accent text-accent-foreground">
          <div className="container-custom text-center">
            <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-accent-foreground/90 mb-8 max-w-2xl mx-auto">
              Schedule your free inspection today and discover why Oklahoma homeowners trust Next Generation Roofing.
            </p>
            <Link to="/contact">
              <Button variant="default" size="xl" className="bg-background text-foreground hover:bg-background/90">
                Schedule Free Inspection
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
