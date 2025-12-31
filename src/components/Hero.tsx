import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Phone } from "lucide-react";
import heroImage from "@/assets/hero-split-building.jpg";
import heroLogo from "@/assets/hero-logo-new.png";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center lg:items-start pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Beautiful residential home with new roof in Oklahoma"
          className="w-full h-full object-cover brightness-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom section-padding lg:pt-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Text Content */}
          <div className="text-primary-foreground space-y-6 lg:space-y-4 animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-4 lg:mb-2">
              <img 
                src={heroLogo} 
                alt="Next Generation Roofing - Veteran Founded & Operated since 2020" 
                className="w-60 sm:w-80 md:w-96 lg:w-[22rem] xl:w-[26rem] h-auto [filter:drop-shadow(0_0_40px_rgba(255,255,255,1))_drop-shadow(0_0_80px_rgba(255,255,255,0.9))_drop-shadow(0_20px_40px_rgba(255,255,255,0.8))_drop-shadow(0_30px_60px_rgba(255,255,255,0.6))]"
              />
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading uppercase leading-tight">
              The Last{" "}
              <span className="text-accent">Contractor</span>{" "}
              You Will Ever Need
            </h1>
            
            <p className="text-base sm:text-xl md:text-2xl text-primary-foreground/90 font-heading px-2">
              Integrity-Driven | Expert Insurance Navigation
            </p>

            <div className="flex items-center justify-center gap-4 pt-2">
              <span className="text-primary-foreground/90 text-sm sm:text-base font-heading uppercase tracking-wide">
                We Cover <span className="text-accent font-bold">1.15 Million</span> Square Feet Of Oklahoma Homes & Businesses Every Year.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 lg:pt-4 justify-center px-4 sm:px-0">
              <a href="tel:4057248092" className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  Schedule Inspection NOW
                </Button>
              </a>
              <a href="#services" className="w-full sm:w-auto">
                <Button variant="heroOutline" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
                  View Our Services
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}