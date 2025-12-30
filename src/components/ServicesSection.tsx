import { useState } from "react";
import { Home, Building2, Droplets, Shield, ChevronDown, CheckCircle } from "lucide-react";

import residentialImg from "@/assets/service-residential.jpg";
import commercialImg from "@/assets/service-commercial.jpg";
import guttersImg from "@/assets/service-gutters.jpg";
import stormImg from "@/assets/service-storm.jpg";

const services = [
  {
    icon: Home,
    title: "Residential Roofing",
    description: "Premium GAF shingles, metal roofing, and SBS impact-resistant solutions for Oklahoma homes.",
    image: residentialImg,
    details: [
      "GAF Timberline HDZ Shingles",
      "Metal Roofing Systems",
      "SBS Modified Bitumen",
      "Impact-Resistant Options",
      "Complete Tear-Off & Replacement",
      "Roof Inspections & Maintenance",
    ],
    fullDescription: "Your home deserves protection that stands the test of Oklahoma's extreme weather. Our residential roofing solutions combine industry-leading materials with expert installation by NGR-supervised crews. We prioritize your family's safety and your home's long-term value.",
  },
  {
    icon: Building2,
    title: "Commercial Roofing",
    description: "TPO, coatings, and flat roof systems designed for commercial durability and longevity.",
    image: commercialImg,
    details: [
      "TPO Single-Ply Membrane",
      "Silicone Roof Coatings",
      "Built-Up Roofing (BUR)",
      "EPDM Rubber Roofing",
      "Preventive Maintenance Programs",
      "Emergency Leak Repair",
    ],
    fullDescription: "Protect your business investment with commercial roofing solutions engineered for durability. Our turnkey approach means minimal disruption to your operations while delivering maximum protection and energy efficiency for your commercial property.",
  },
  {
    icon: Droplets,
    title: "Gutter Division",
    description: "Seamless gutters in custom colors, professionally installed for optimal water management.",
    image: guttersImg,
    details: [
      "Seamless Aluminum Gutters",
      "Custom Color Matching",
      "Gutter Guards & Protection",
      "Downspout Installation",
      "Fascia & Soffit Repair",
      "Complete Drainage Solutions",
    ],
    fullDescription: "Proper water management protects your home's foundation, landscaping, and structural integrity. Our seamless gutter systems are custom-fabricated on-site for a perfect fit, available in colors that complement your home's exterior.",
  },
  {
    icon: Shield,
    title: "Storm Damage & Insurance",
    description: "We fight for every dollar you deserve. Our insurance experts advocate aggressively to maximize your claim.",
    image: stormImg,
    details: [
      "Free Storm Damage Inspections",
      "Aggressive Insurance Advocacy",
      "Maximum Claim Recovery",
      "Adjuster Meeting Support",
      "Documentation & Photography",
      "Emergency Tarping Services",
    ],
    fullDescription: "When storms strike, insurance companies don't always have your best interests at heart. That's where we step in. Our team fights for every dollar you deserve—we know the tactics adjusters use and we push back to ensure you get the highest quality roof, not the cheapest repair. With 45+ years of combined experience navigating Oklahoma insurance claims, we've recovered millions for homeowners who were initially underpaid or denied. We document every shingle, every dent, and every detail to build an airtight case. You shouldn't have to settle for less when you've been paying premiums for years. Let us be your advocate and get you what you're truly owed.",
  },
];

export function ServicesSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            Our Services
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive roofing solutions for residential and commercial properties across Oklahoma, Kansas & Texas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image Header */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-primary-foreground">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <service.icon className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <h3 className="font-heading text-xl uppercase">{service.title}</h3>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {service.description}
                </p>

                {/* Expand Button */}
                <button
                  onClick={() => toggleExpand(index)}
                  className="flex items-center gap-2 text-accent font-heading uppercase text-sm tracking-wider hover:text-accent/80 transition-colors"
                >
                  {expandedIndex === index ? "Show Less" : "Learn More"}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      expandedIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expandable Content */}
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    expandedIndex === index ? "max-h-[500px] opacity-100 mt-6" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-foreground mb-4 leading-relaxed">
                    {service.fullDescription}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {service.details.map((detail) => (
                      <div key={detail} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{detail}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href="#contact"
                    className="inline-block mt-6 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading uppercase text-sm tracking-wider hover:bg-accent/90 transition-colors"
                  >
                    Get Free Estimate
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}