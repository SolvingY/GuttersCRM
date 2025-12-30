import { useState } from "react";
import { Menu, X, Phone, ChevronDown, Instagram, Facebook, Star, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

// Custom TikTok icon since Lucide doesn't have one
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const services = [
  { name: "Residential Roofing", href: "#services" },
  { name: "Commercial Roofing", href: "#services" },
  { name: "Gutter Division", href: "#services" },
  { name: "Storm Damage & Insurance", href: "#services" },
];

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "Why Choose Us", href: "#why-choose-us" },
  { name: "About Us", href: "#about" },
  { name: "Team", href: "#team" },
  { name: "Reviews", href: "#reviews" },
  { name: "Contact", href: "#contact" },
];

const socialLinks = [
  {
    icon: Instagram,
    label: "Instagram",
    href: "https://www.instagram.com/next_generation_roofing/",
  },
  {
    icon: Facebook,
    label: "Facebook",
    href: "https://www.facebook.com/people/Next-Generation-Roofing/100064277643225/?mibextid=LQQJ4d",
  },
  {
    icon: TikTokIcon,
    label: "TikTok",
    href: "https://www.tiktok.com/@nextgenerationroofingokc",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/oknextgen/",
  },
  {
    icon: Star,
    label: "Google Reviews",
    href: "https://share.google/APxY30i8K9jflKJOx",
  },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-sm text-primary-foreground shadow-lg">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20 px-4">
          {/* Left side: Social Icons + Logo */}
          <div className="flex items-center gap-4">
            {/* Social Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-primary-foreground/10 hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* Logo */}
            <a 
              href="#home" 
              onClick={(e) => scrollToSection(e, "#home")}
              className="flex items-center gap-3"
            >
              <img src={logo} alt="Next Generation Roofing" className="h-12 w-12 md:h-14 md:w-14 rounded-full" />
              <span className="hidden md:block font-heading text-lg md:text-xl font-bold uppercase tracking-wide">
                Next Generation Roofing
              </span>
            </a>
          </div>


          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, "#home")}
              className="font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
            >
              Home
            </a>

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <a 
                href="#services"
                onClick={(e) => scrollToSection(e, "#services")}
                className="flex items-center gap-1 font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
              >
                Services
                <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
              </a>
              {servicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-background text-foreground rounded-lg shadow-xl border border-border overflow-hidden animate-fade-in">
                  {services.map((service) => (
                    <a
                      key={service.name}
                      href={service.href}
                      onClick={(e) => scrollToSection(e, service.href)}
                      className="block px-4 py-3 text-sm hover:bg-secondary transition-colors"
                    >
                      {service.name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <a
              href="#about"
              onClick={(e) => scrollToSection(e, "#about")}
              className="font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
            >
              About
            </a>
            <a
              href="#team"
              onClick={(e) => scrollToSection(e, "#team")}
              className="font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
            >
              Team
            </a>
            <a
              href="#why-choose-us"
              onClick={(e) => scrollToSection(e, "#why-choose-us")}
              className="font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
            >
              Why Choose Us
            </a>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, "#contact")}
              className="font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
            >
              Contact
            </a>
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-4">
            <a href="tel:4057248092" className="hidden md:flex">
              <Button variant="nav" size="sm" className="gap-2">
                <Phone className="w-4 h-4" />
                <span>(405) 724-8092</span>
              </Button>
            </a>
            
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-primary border-t border-primary-foreground/20 animate-slide-up">
            <nav className="py-4 px-4 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className="block py-2 font-heading uppercase tracking-wider hover:text-accent transition-colors"
                >
                  {link.name}
                </a>
              ))}

              <a href="tel:4057248092" className="block pt-4">
                <Button variant="cta" className="w-full gap-2">
                  <Phone className="w-4 h-4" />
                  Call (405) 724-8092
                </Button>
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
