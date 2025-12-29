import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Phone } from "lucide-react";
import heroImage from "@/assets/hero-roof.jpg";
import heroLogo from "@/assets/hero-logo.png";

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
        <div className="max-w-3xl mx-auto text-center">
          {/* Text Content */}
          <div className="text-primary-foreground space-y-6 animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={heroLogo} 
                alt="Next Generation Roofing - Veteran Founded & Operated since 2020" 
                className="w-64 md:w-80 lg:w-96 h-auto"
              />
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading uppercase leading-tight">
              Oklahoma's Trusted{" "}
              <span className="text-accent">Roofing</span>{" "}
              Experts
            </h1>
            
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-heading">
              Integrity-Driven | Expert Insurance Navigation
            </p>

            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-primary-foreground/80 text-sm">
                Rated 5/5 by Oklahoma Homeowners
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 justify-center">
              <a href="tel:4057248092">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <Phone className="w-5 h-5" />
                  Schedule Your Inspection NOW
                </Button>
              </a>
              <a href="#services">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                  View Our Services
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}