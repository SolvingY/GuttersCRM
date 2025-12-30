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

            {/* Map - Regional View including OK, KS, TX with accurate state shapes */}
            <div className="bg-background rounded-lg overflow-hidden h-72 shadow-lg p-4 flex items-center justify-center">
              <svg viewBox="0 0 500 400" className="w-full h-full max-w-lg">
                {/* Kansas - rectangular with slight angle on west */}
                <path
                  d="M150 40 L350 40 L350 95 L145 95 Z"
                  fill="hsl(var(--accent) / 0.1)"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                />
                <text x="250" y="72" textAnchor="middle" className="fill-accent font-heading text-xs font-bold">
                  KANSAS
                </text>
                
                {/* Oklahoma - panhandle shape */}
                <path
                  d="M100 95 L145 95 L145 115 L350 115 L350 95 L355 95 L370 110 L370 180 L100 180 L100 130 Z"
                  fill="hsl(var(--accent) / 0.1)"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                />
                <text x="235" y="150" textAnchor="middle" className="fill-accent font-heading text-xs font-bold">
                  OKLAHOMA
                </text>
                
                {/* Texas - distinctive shape */}
                <path
                  d="M100 180 L370 180 L400 200 L400 260 L380 280 L360 320 L300 360 L250 370 L200 360 L150 340 L120 300 L100 260 Z"
                  fill="hsl(var(--accent) / 0.1)"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                />
                <text x="260" y="260" textAnchor="middle" className="fill-accent font-heading text-xs font-bold">
                  TEXAS
                </text>
                
                {/* City Stars */}
                {/* Wichita, KS */}
                <polygon points="280,65 282,70 288,70 283,74 285,80 280,76 275,80 277,74 272,70 278,70" fill="hsl(var(--accent))" />
                <text x="280" y="58" textAnchor="middle" className="fill-foreground text-[8px]">Wichita</text>
                
                {/* OKC, OK */}
                <polygon points="230,145 232,150 238,150 233,154 235,160 230,156 225,160 227,154 222,150 228,150" fill="hsl(var(--accent))" />
                <text x="230" y="138" textAnchor="middle" className="fill-foreground text-[8px]">OKC</text>
                
                {/* Tulsa, OK */}
                <polygon points="310,130 312,135 318,135 313,139 315,145 310,141 305,145 307,139 302,135 308,135" fill="hsl(var(--accent))" />
                <text x="310" y="123" textAnchor="middle" className="fill-foreground text-[8px]">Tulsa</text>
                
                {/* Lawton, OK */}
                <polygon points="180,165 182,170 188,170 183,174 185,180 180,176 175,180 177,174 172,170 178,170" fill="hsl(var(--accent))" />
                <text x="180" y="158" textAnchor="middle" className="fill-foreground text-[8px]">Lawton</text>
                
                {/* Dallas, TX */}
                <polygon points="280,220 282,225 288,225 283,229 285,235 280,231 275,235 277,229 272,225 278,225" fill="hsl(var(--accent))" />
                <text x="280" y="213" textAnchor="middle" className="fill-foreground text-[8px]">Dallas</text>
                
                {/* Austin, TX */}
                <polygon points="230,290 232,295 238,295 233,299 235,305 230,301 225,305 227,299 222,295 228,295" fill="hsl(var(--accent))" />
                <text x="230" y="283" textAnchor="middle" className="fill-foreground text-[8px]">Austin</text>
                
                {/* San Antonio, TX */}
                <polygon points="200,320 202,325 208,325 203,329 205,335 200,331 195,335 197,329 192,325 198,325" fill="hsl(var(--accent))" />
                <text x="200" y="313" textAnchor="middle" className="fill-foreground text-[8px]">San Antonio</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
