import { Link } from "react-router-dom";
import { Home, Building2, Droplets, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Home,
    title: "Residential Roofing",
    description: "Premium GAF shingles, metal roofing, and SBS impact-resistant solutions for Oklahoma homes.",
    href: "/services/residential",
  },
  {
    icon: Building2,
    title: "Commercial Roofing",
    description: "TPO, coatings, and flat roof systems designed for commercial durability and longevity.",
    href: "/services/commercial",
  },
  {
    icon: Droplets,
    title: "Gutter Division",
    description: "Seamless gutters in custom colors, professionally installed for optimal water management.",
    href: "/services/gutters",
  },
  {
    icon: Shield,
    title: "Storm Damage & Insurance",
    description: "Expert storm damage assessment and insurance claim negotiation support for homeowners.",
    href: "/services/storm-damage",
  },
];

export function ServicesSection() {
  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            Our Services
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive roofing solutions for residential and commercial properties across Oklahoma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group bg-card border border-border rounded-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent transition-colors">
                <service.icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="font-heading text-xl uppercase mb-3">{service.title}</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {service.description}
              </p>
              <Link to={service.href}>
                <Button variant="outline" size="sm" className="group/btn">
                  Learn More
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
