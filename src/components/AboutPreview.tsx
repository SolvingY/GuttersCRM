import { Shield, Target, Award } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Growth",
    description: "We continuously improve our skills, processes, and service to deliver the best possible results for our clients.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Every project receives our full attention and commitment to quality, from inspection to final cleanup.",
  },
  {
    icon: Shield,
    title: "Integrity",
    description: "Honesty and transparency guide every interaction. We do what we say, and we say what we do.",
  },
];

export function AboutPreview() {
  return (
    <section className="bg-primary text-primary-foreground section-padding">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-accent">
              <Shield className="w-5 h-5" />
              <span className="font-heading text-sm uppercase tracking-wider">
                About Us
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase leading-tight">
              Built on <span className="text-accent">Service</span>,{" "}
              Dedicated to <span className="text-accent">Excellence</span>
            </h2>
            
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Next Generation Roofing is a Veteran-Owned roofing company proudly serving Oklahoma City and the surrounding metro area. Our military background instilled in us the values of discipline, precision, and unwavering commitment to mission success—values we bring to every roofing project we undertake.
            </p>
            
            <p className="text-primary-foreground/80 leading-relaxed">
              With over 200 five-star reviews and a 7-year workmanship guarantee, we've built our reputation on delivering exceptional results and treating every customer like family.
            </p>
          </div>

          {/* Right Column - Values */}
          <div className="space-y-6">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="flex gap-5 p-6 bg-primary-foreground/5 rounded-lg hover:bg-primary-foreground/10 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                  <value.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-heading text-xl uppercase mb-2">{value.title}</h3>
                  <p className="text-primary-foreground/70 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
