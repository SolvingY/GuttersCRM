import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/LeadForm";
import { ArrowRight, Star, Shield } from "lucide-react";
import heroImage from "@/assets/hero-roof.jpg";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Beautiful residential home with new roof in Oklahoma"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom section-padding">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Text */}
          <div className="text-primary-foreground space-y-6 animate-slide-in-left">
            <div className="flex items-center gap-2 text-accent">
              <Shield className="w-5 h-5" />
              <span className="font-heading text-sm uppercase tracking-wider">
                Veteran-Owned & Operated
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading uppercase leading-tight">
              Oklahoma's Trusted{" "}
              <span className="text-accent">Veteran-Owned</span>{" "}
              Roofing Experts
            </h1>
            
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-heading">
              7-Year Workmanship Guarantee | 200+ 5-Star Reviews
            </p>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-primary-foreground/80 text-sm">
                Rated 5/5 by Oklahoma Homeowners
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="https://example.com/quote"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Get Instant Roof Quote
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <a href="#services">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                  View Our Services
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column - Lead Form */}
          <div className="animate-slide-in-right">
            <div className="bg-background rounded-lg shadow-2xl p-6 md:p-8">
              <div className="text-center mb-6">
                <h2 className="font-heading text-2xl md:text-3xl uppercase text-foreground mb-2">
                  Free Roof Inspection
                </h2>
                <p className="text-muted-foreground">
                  Schedule your no-obligation inspection today
                </p>
              </div>
              <LeadForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
