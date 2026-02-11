import { Phone, Mail, MapPin, Instagram, Star, Linkedin, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

const services = [
  { name: "Residential Roofing", href: "#services" },
  { name: "Commercial Roofing", href: "#services" },
  { name: "Gutter Division", href: "#services" },
  { name: "Storm Damage & Insurance", href: "#services" },
];

const quickLinks = [
  { name: "About Us", href: "#about" },
  { name: "Meet the Team", href: "#team" },
  { name: "Reviews", href: "#reviews" },
  { name: "Contact", href: "#contact" },
];

export function Footer() {
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
  };

  return (
    <footer className="bg-primary text-primary-foreground pb-20 md:pb-0">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Next Generation Roofing" className="h-14 w-14 rounded-full" />
              <div>
                <h3 className="font-heading text-xl uppercase">Next Generation</h3>
                <p className="text-sm text-primary-foreground/70">Roofing</p>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              Oklahoma's trusted Veteran-Operated & Supported roofing experts. Serving the OKC metro with excellence, integrity, and a 7-year workmanship guarantee.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.facebook.com/profile.php?id=100064277643225" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" 
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" 
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://www.tiktok.com/@nextgenerationroofingokc" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" 
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a 
                href="https://www.linkedin.com/in/oknextgen/" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" 
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://share.google/APxY30i8K9jflKJOx" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" 
                aria-label="Google Reviews"
              >
                <Star className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading text-lg uppercase mb-6 text-accent">Our Services</h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.name}>
                  <a
                    href={service.href}
                    onClick={(e) => scrollToSection(e, service.href)}
                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    {service.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg uppercase mb-6 text-accent">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.href)}
                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/get-quote"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Free Estimate
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-heading text-lg uppercase mb-6 text-accent">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 mt-0.5 text-accent" />
                <div>
                  <p className="text-sm font-semibold">Call Us</p>
                  <a href="tel:4057248092" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    (405) 724-8092
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5 text-accent" />
                <div>
                  <p className="text-sm font-semibold">Email Us</p>
                  <a href="mailto:nextgenroofing@oknextgen.com" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    nextgenroofing@oknextgen.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 text-accent" />
                <div>
                  <p className="text-sm font-semibold">Location</p>
                  <p className="text-sm text-primary-foreground/80">
                    Oklahoma City, OK
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} Next Generation Roofing. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-primary-foreground/60">
              <span>Veteran-Operated & Supported</span>
              <span className="hidden sm:inline">|</span>
              <span>7-Year Workmanship Guarantee</span>
              <span className="hidden sm:inline">|</span>
              <span>OK HB 1940 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
