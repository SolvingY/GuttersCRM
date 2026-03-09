import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, ArrowLeft, Shield, MapPin, Building2, Target } from "lucide-react";
import ngrLogo from "@/assets/ngr-logo.png";
import teamRob from "@/assets/team-rob.png";
import teamJonathan from "@/assets/team-jonathan.png";
import teamKara from "@/assets/team-kara.png";

const leaders = [
  {
    name: 'Robert "Rob" Baker',
    title: "Owner",
    image: teamRob,
    description: "With 15 years of industry leadership and ownership, Rob is the engine behind NGR's reputation. His focus on excellence ensures every build meets the NGR standard.",
  },
  {
    name: "Jonathan Whitton",
    title: "General Manager",
    image: teamJonathan,
    description: "The architect of our sales and service vision. Jonathan ensures that NGR remains the fastest-growing and most trusted name in Oklahoma roofing.",
  },
  {
    name: "Kara Jameson",
    title: "Chief Administration Officer",
    image: teamKara,
    description: "The backbone of NGR operations. Kara manages the systems and administrative health that allow our field teams to perform with elite efficiency.",
  },
  {
    name: "Matt Fowler",
    title: "Field Trainer",
    image: null,
    description: "The mentor. Matt is dedicated to the success of our new team members, providing the hands-on field training needed to turn prospects into top-tier sales reps and canvassers.",
  },
];

const values = [
  { icon: Target, label: "Growth", desc: "We get better every single day." },
  { icon: Shield, label: "Excellence", desc: "Quality is our baseline, not our goal." },
  { icon: ArrowLeft, label: "Humility", desc: "We are always coachable." },
  { icon: Building2, label: "Reputation", desc: "We do what we say we will do." },
];

export default function ApplicationThankYou() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground py-8 px-4 text-center">
        <img src={ngrLogo} alt="NGR" className="h-16 mx-auto mb-4" />
        <h1 className="font-heading text-3xl md:text-4xl uppercase">Welcome to the Next Generation</h1>
        <p className="text-sm opacity-80 mt-2 max-w-lg mx-auto">
          Thank you for your interest. At NGR, we don't just "hire"—we build high-performance teams that protect Oklahoma homes.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Who We Are */}
        <section>
          <h2 className="font-heading text-2xl uppercase mb-6 text-center">Who We Are</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <Shield className="w-8 h-8 text-accent mx-auto mb-3" />
              <h3 className="font-heading uppercase text-lg mb-2">Veteran-Operated</h3>
              <p className="text-sm text-muted-foreground">We bring military-grade discipline and precision to the roofing industry.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <MapPin className="w-8 h-8 text-accent mx-auto mb-3" />
              <h3 className="font-heading uppercase text-lg mb-2">Oklahoma Roots</h3>
              <p className="text-sm text-muted-foreground">100% local. 50+ years of collective expertise. We aren't here for the storm; we're here for the community.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <Building2 className="w-8 h-8 text-accent mx-auto mb-3" />
              <h3 className="font-heading uppercase text-lg mb-2">Proven Scale</h3>
              <p className="text-sm text-muted-foreground">We cover 1.15 Million square feet of Oklahoma homes annually.</p>
            </div>
          </div>
        </section>

        {/* Leadership */}
        <section>
          <h2 className="font-heading text-2xl uppercase mb-6 text-center">Meet the Leadership Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leaders.map((leader) => (
              <div key={leader.name} className="bg-card border border-border rounded-lg p-6 flex gap-4">
                {leader.image ? (
                  <img src={leader.image} alt={leader.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="font-heading text-accent text-xl">{leader.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-heading uppercase">{leader.name}</h3>
                  <p className="text-accent text-sm font-heading uppercase">{leader.title}</p>
                  <p className="text-sm text-muted-foreground mt-2">{leader.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section>
          <h2 className="font-heading text-2xl uppercase mb-6 text-center">Our Core Values</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {values.map((v) => (
              <div key={v.label} className="bg-card border border-border rounded-lg p-4 text-center">
                <v.icon className="w-6 h-6 text-accent mx-auto mb-2" />
                <h3 className="font-heading uppercase text-sm mb-1">{v.label}</h3>
                <p className="text-xs text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social */}
        <section className="text-center space-y-4">
          <h2 className="font-heading text-xl uppercase">See the Team in Action</h2>
          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/profile.php?id=100064277643225"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg hover:border-accent transition-colors"
            >
              <Facebook className="w-5 h-5 text-accent" /> Facebook
            </a>
            <a
              href="https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg hover:border-accent transition-colors"
            >
              <Instagram className="w-5 h-5 text-accent" /> Instagram
            </a>
          </div>
        </section>

        {/* Footer message */}
        <div className="text-center border-t border-border pt-8">
          <p className="text-muted-foreground mb-6">
            We will review your application and reach out if there's a fit. Thank you for your interest in Next Generation Roofing.
          </p>
          <Link to="/">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
