import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Users, Mail, Phone } from "lucide-react";

const teamMembers = [
  {
    name: "Rob",
    role: "Owner",
    description: "As a proud veteran and founder of Next Generation Roofing, Rob brings military precision and leadership to every aspect of the business. His commitment to excellence and customer satisfaction drives the company's success.",
    image: null,
  },
  {
    name: "Jonathan",
    role: "General Manager",
    description: "Jonathan oversees day-to-day operations, ensuring every project runs smoothly from start to finish. His attention to detail and organizational skills keep the team on track and customers happy.",
    image: null,
  },
  {
    name: "Matt",
    role: "Field Manager",
    description: "Matt leads our field crews with hands-on expertise and a keen eye for quality. He ensures every installation meets our rigorous standards and that our crews are equipped for success.",
    image: null,
  },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-primary-foreground">
          <div className="container-custom px-4">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-accent mb-4">
                <Users className="w-5 h-5" />
                <span className="font-heading text-sm uppercase tracking-wider">
                  Our Team
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase mb-6">
                Meet the <span className="text-accent">Leadership</span>
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                The experienced professionals behind Oklahoma's most trusted roofing company.
              </p>
            </div>
          </div>
        </section>

        {/* Team Grid */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  <div className="h-64 bg-section-alt flex items-center justify-center">
                    <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                      <span className="text-5xl font-heading text-primary-foreground">
                        {member.name[0]}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-2xl uppercase mb-1">{member.name}</h3>
                    <p className="text-accent font-heading uppercase text-sm mb-4">{member.role}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {member.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join Us CTA */}
        <section className="section-padding bg-section-alt">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-heading uppercase mb-4">
                Join Our Team
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                We're always looking for skilled, dedicated professionals to join the Next Generation Roofing family. If you're passionate about quality work and customer service, we want to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:careers@nextgenroofingok.com"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-heading uppercase tracking-wider hover:bg-primary/90 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </a>
                <a
                  href="tel:4057248092"
                  className="inline-flex items-center justify-center gap-2 border-2 border-primary text-primary px-6 py-3 rounded-md font-heading uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call (405) 724-8092
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
