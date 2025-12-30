import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function ContactSection() {
  return (
    <div className="section-padding bg-section-alt">
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-accent mb-4">
            <MapPin className="w-5 h-5" />
            <span className="font-heading text-sm uppercase tracking-wider">
              Contact Us
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            Get Your <span className="text-accent">Free Estimate</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ready for a free roof inspection? Have questions? We're here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Call to Action */}
          <div className="bg-background rounded-lg p-8 shadow-lg flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-2xl md:text-3xl font-heading uppercase mb-4">
              Schedule Your Inspection NOW
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Call us today for a FREE no-obligation roof inspection. Our experts are standing by to help protect your home.
            </p>
            <Button asChild variant="cta" size="lg" className="text-xl px-8 py-6">
              <a href="tel:4057248092">
                <Phone className="w-6 h-6 mr-2" />
                (405) 724-8092
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Or email us at{" "}
              <a href="mailto:nextgenroofing@oknextgen.com" className="text-accent hover:underline">
                nextgenroofing@oknextgen.com
              </a>
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-background rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-heading uppercase mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-heading uppercase mb-1">Phone</h4>
                    <a href="tel:4057248092" className="text-muted-foreground hover:text-accent transition-colors text-lg font-semibold">
                      (405) 724-8092
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-heading uppercase mb-1">Email</h4>
                    <a href="mailto:nextgenroofing@oknextgen.com" className="text-muted-foreground hover:text-accent transition-colors">
                      nextgenroofing@oknextgen.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-heading uppercase mb-1">Service Area</h4>
                    <p className="text-muted-foreground">
                      Oklahoma, Kansas & Texas<br />
                      OKC Metro, Dallas-Fort Worth, Wichita & more
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-heading uppercase mb-1">Hours</h4>
                    <p className="text-muted-foreground">
                      Monday - Friday: 8am - 6pm<br />
                      Saturday: 9am - 4pm
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map - Regional View including OK, KS, TX */}
            <div className="bg-background rounded-lg overflow-hidden h-64 shadow-lg p-4 flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full h-full max-w-md">
                {/* Kansas */}
                <path
                  d="M120 50 L280 50 L280 100 L120 100 Z"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="3"
                  className="drop-shadow-sm"
                />
                <text x="200" y="80" textAnchor="middle" className="fill-accent font-heading text-sm font-bold">
                  KANSAS
                </text>
                
                {/* Oklahoma */}
                <path
                  d="M100 100 L280 100 L280 130 L300 130 L300 180 L120 180 L120 130 L100 130 Z"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="3"
                  className="drop-shadow-sm"
                />
                <text x="200" y="150" textAnchor="middle" className="fill-accent font-heading text-sm font-bold">
                  OKLAHOMA
                </text>
                
                {/* Texas */}
                <path
                  d="M80 180 L300 180 L320 200 L320 280 L200 280 L180 260 L100 260 L80 240 Z"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="3"
                  className="drop-shadow-sm"
                />
                <text x="200" y="230" textAnchor="middle" className="fill-accent font-heading text-sm font-bold">
                  TEXAS
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
