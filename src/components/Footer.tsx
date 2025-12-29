import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/logo.jpg";

const services = [
  { name: "Residential Roofing", href: "/services/residential" },
  { name: "Commercial Roofing", href: "/services/commercial" },
  { name: "Gutter Division", href: "/services/gutters" },
  { name: "Storm Damage & Insurance", href: "/services/storm-damage" },
];

const quickLinks = [
  { name: "About Us", href: "/about" },
  { name: "Meet the Team", href: "/team" },
  { name: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
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
              <a href="#" className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-primary-foreground/10 rounded hover:bg-accent transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading text-lg uppercase mb-6 text-accent">Our Services</h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.name}>
                  <Link
                    to={service.href}
                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    {service.name}
                  </Link>
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
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="#quote"
                  className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Free Inspection
                </a>
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
                  <a href="mailto:info@nextgenroofingok.com" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
                    info@nextgenroofingok.com
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
