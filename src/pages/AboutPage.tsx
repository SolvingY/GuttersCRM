import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Shield, Target, Award, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const values = [
  {
    icon: Target,
    title: "Growth",
    description: "We continuously improve our skills, processes, and service to deliver the best possible results for our clients. Our team stays current with the latest roofing technologies and best practices.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Every project receives our full attention and commitment to quality, from the initial inspection to the final cleanup. We don't cut corners, and we don't settle for 'good enough.'",
  },
  {
    icon: Shield,
    title: "Integrity",
    description: "Honesty and transparency guide every interaction. We provide accurate assessments, fair pricing, and keep you informed throughout the entire process. We do what we say, and we say what we do.",
  },
];

const highlights = [
  "Veteran-Owned & Operated",
  "7-Year Workmanship Guarantee",
  "200+ 5-Star Reviews",
  "GAF Certified Contractors",
  "BBB A+ Rating",
  "Licensed & Fully Insured",
  "Free Inspections",
  "Insurance Claim Specialists",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-primary-foreground">
          <div className="container-custom px-4">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-accent mb-4">
                <Shield className="w-5 h-5" />
                <span className="font-heading text-sm uppercase tracking-wider">
                  About Us
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase mb-6">
                Built on <span className="text-accent">Service</span>,{" "}
                Dedicated to <span className="text-accent">Excellence</span>
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                Next Generation Roofing is a Veteran-Owned roofing company proudly serving Oklahoma City and the surrounding metro area.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-heading uppercase">
                  Our Story
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Founded by veterans who served our country with honor, Next Generation Roofing was built on the principles that guided our military service: discipline, precision, and an unwavering commitment to mission success.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  When we transitioned from military service, we knew we wanted to continue serving our community. Roofing was a natural fit—it requires attention to detail, problem-solving skills, and the ability to work as a cohesive team under pressure.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Today, we bring that same dedication to every roofing project we undertake. Whether it's a simple repair or a complete roof replacement, we approach each job with the same level of professionalism and care.
                </p>
              </div>
              <div className="bg-section-alt rounded-lg p-8">
                <h3 className="font-heading text-2xl uppercase mb-6">Why Choose Us?</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="section-padding bg-section-alt">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
                Our Core Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These values guide every decision we make and every project we complete.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-background rounded-lg p-8 text-center hover:shadow-xl transition-shadow"
                >
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <value.icon className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-heading text-2xl uppercase mb-4">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-accent text-accent-foreground">
          <div className="container-custom text-center">
            <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
              Ready to Work with Oklahoma's Best?
            </h2>
            <p className="text-accent-foreground/90 mb-8 max-w-2xl mx-auto">
              Experience the Next Generation difference. Schedule your free inspection today.
            </p>
            <Link to="/contact">
              <Button variant="default" size="xl" className="bg-background text-foreground hover:bg-background/90">
                Contact Us Today
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
