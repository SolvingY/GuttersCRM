import { useState } from "react";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

const services = [
  { name: "Residential Roofing", href: "#services" },
  { name: "Commercial Roofing", href: "#services" },
  { name: "Gutter Division", href: "#services" },
  { name: "Storm Damage & Insurance", href: "#services" },
];

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "About Us", href: "#about" },
  { name: "Team", href: "#team" },
  { name: "Reviews", href: "#reviews" },
  { name: "Contact", href: "#contact" },
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
          {/* Logo */}
          <a 
            href="#home" 
            onClick={(e) => scrollToSection(e, "#home")}
            className="flex items-center gap-3"
          >
            <img src={logo} alt="Next Generation Roofing" className="h-12 w-12 md:h-14 md:w-14 rounded-full" />
            <span className="hidden sm:block font-heading text-lg md:text-xl font-bold uppercase tracking-wide">
              Next Generation Roofing
            </span>
          </a>

          {/* Center - Roof Quote Button */}
          <div className="hidden xl:flex absolute left-1/2 -translate-x-1/2">
            <a href="tel:4057248092">
              <Button variant="cta" size="sm" className="font-heading uppercase tracking-wider">
                Roof Quote
              </Button>
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
              href="#reviews"
              onClick={(e) => scrollToSection(e, "#reviews")}
              className="font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent"
            >
              Reviews
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
