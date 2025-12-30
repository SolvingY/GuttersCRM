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
            <div className="bg-background rounded-lg overflow-hidden h-80 shadow-lg p-4 flex items-center justify-center">
              <svg viewBox="0 0 450 380" className="w-full h-full max-w-lg">
                {/* Kansas - accurate shape (mostly rectangular with slight variations) */}
                <path
                  d="M120 25 L340 25 L340 85 L118 85 L115 70 L120 25"
                  fill="hsl(var(--accent) / 0.15)"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                />
                <text x="230" y="60" textAnchor="middle" className="fill-accent font-heading text-[10px] font-bold">
                  KANSAS
                </text>
                
                {/* Oklahoma - accurate panhandle shape */}
                <path
                  d="M60 85 L60 110 L175 110 L175 85 L340 85 L355 90 L360 100 L360 170 L340 175 L280 175 L260 180 L60 180 L60 85"
                  fill="hsl(var(--accent) / 0.15)"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                />
                <text x="210" y="145" textAnchor="middle" className="fill-accent font-heading text-[10px] font-bold">
                  OKLAHOMA
                </text>
                
                {/* Texas - accurate distinctive shape with panhandle, gulf coast, rio grande */}
                <path
                  d="M60 180 L175 180 L175 195 L260 195 L280 180 L340 180 L360 175 L380 185 L390 210 L395 250 L385 280 L370 310 L340 340 L300 355 L260 365 L220 360 L180 345 L150 320 L130 290 L110 260 L90 230 L70 210 L60 195 L60 180"
                  fill="hsl(var(--accent) / 0.15)"
                  stroke="hsl(var(--accent))"
                  strokeWidth="2.5"
                />
                <text x="240" y="270" textAnchor="middle" className="fill-accent font-heading text-[10px] font-bold">
                  TEXAS
                </text>
                
                {/* City Stars */}
                {/* Wichita, KS - south-central Kansas */}
                <polygon points="270,70 272,75 278,75 273,79 275,85 270,81 265,85 267,79 262,75 268,75" fill="hsl(var(--accent))" />
                <text x="270" y="64" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">Wichita</text>
                
                {/* OKC, OK - central Oklahoma */}
                <polygon points="220,140 222,145 228,145 223,149 225,155 220,151 215,155 217,149 212,145 218,145" fill="hsl(var(--accent))" />
                <text x="220" y="134" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">OKC</text>
                
                {/* Tulsa, OK - northeast Oklahoma */}
                <polygon points="300,120 302,125 308,125 303,129 305,135 300,131 295,135 297,129 292,125 298,125" fill="hsl(var(--accent))" />
                <text x="300" y="114" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">Tulsa</text>
                
                {/* Lawton, OK - southwest Oklahoma */}
                <polygon points="170,160 172,165 178,165 173,169 175,175 170,171 165,175 167,169 162,165 168,165" fill="hsl(var(--accent))" />
                <text x="170" y="154" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">Lawton</text>
                
                {/* Dallas, TX - north-central Texas */}
                <polygon points="280,220 282,225 288,225 283,229 285,235 280,231 275,235 277,229 272,225 278,225" fill="hsl(var(--accent))" />
                <text x="280" y="214" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">Dallas</text>
                
                {/* Austin, TX - central Texas */}
                <polygon points="210,290 212,295 218,295 213,299 215,305 210,301 205,305 207,299 202,295 208,295" fill="hsl(var(--accent))" />
                <text x="210" y="284" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">Austin</text>
                
                {/* San Antonio, TX - south-central Texas */}
                <polygon points="190,315 192,320 198,320 193,324 195,330 190,326 185,330 187,324 182,320 188,320" fill="hsl(var(--accent))" />
                <text x="190" y="309" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">San Antonio</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
