import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

const services = [
  { name: "Residential Roofing", href: "/services/residential" },
  { name: "Commercial Roofing", href: "/services/commercial" },
  { name: "Gutter Division", href: "/services/gutters" },
  { name: "Storm Damage & Insurance", href: "/services/storm-damage" },
];

const navLinks = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Meet the Team", href: "/team" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Next Generation Roofing" className="h-12 w-12 md:h-14 md:w-14 rounded-full" />
            <span className="hidden sm:block font-heading text-lg md:text-xl font-bold uppercase tracking-wide">
              Next Generation Roofing
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.slice(0, 1).map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent ${
                  isActive(link.href) ? "text-accent" : ""
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button className="flex items-center gap-1 font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent">
                Services
                <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-background text-foreground rounded-lg shadow-xl border border-border overflow-hidden animate-fade-in">
                  {services.map((service) => (
                    <Link
                      key={service.name}
                      to={service.href}
                      className="block px-4 py-3 text-sm hover:bg-secondary transition-colors"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.slice(1).map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`font-heading text-sm uppercase tracking-wider transition-colors hover:text-accent ${
                  isActive(link.href) ? "text-accent" : ""
                }`}
              >
                {link.name}
              </Link>
            ))}
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
              {navLinks.slice(0, 1).map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block py-2 font-heading uppercase tracking-wider"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="py-2">
                <span className="font-heading uppercase tracking-wider text-accent">Services</span>
                <div className="ml-4 mt-2 space-y-2">
                  {services.map((service) => (
                    <Link
                      key={service.name}
                      to={service.href}
                      className="block py-1 text-sm text-primary-foreground/80 hover:text-primary-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
              
              {navLinks.slice(1).map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block py-2 font-heading uppercase tracking-wider"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
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
