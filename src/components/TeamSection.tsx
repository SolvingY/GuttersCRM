import { Users, Mail } from "lucide-react";
import teamRob from "@/assets/team-rob.png";
import teamJonathan from "@/assets/team-jonathan.png";
import teamDustin from "@/assets/team-dustin.png";
import teamKara from "@/assets/team-kara.png";

const teamMembers = [
  {
    name: "Rob Baker",
    role: "Owner",
    email: "R.baker@oknextgen.com",
    description: "With 15+ years of roofing and insurance industry experience, Rob is the founder and visionary behind NGR's Core Values: Growth, Customer Service, Humility, Excellence, Employee Empowerment, and Reputation.",
    image: teamRob,
  },
  {
    name: "Jonathan Whitton",
    role: "General Manager",
    email: "J.whitton@oknextgen.com",
    description: "Jonathan brings 20+ years of experience in construction and roofing to his role as General Manager. He oversees all company-wide operations and sales accountability, ensuring every project meets our high standards.",
    image: teamJonathan,
  },
  {
    name: "Dustin Jameson",
    role: "Lead Project Manager",
    email: "D.Jameson@oknextgen.com",
    description: "As a veteran, Dustin brings unmatched professionalism and discipline to every project. A founding member of Next Generation Roofing, he leads our project management team with exceptional client communication, seamless coordination, and a commitment to delivering outstanding results on every job.",
    image: teamDustin,
  },
  {
    name: "Kara Jameson",
    role: "Office Manager",
    email: "k.jameson@oknextgen.com",
    description: "With 10+ years of experience in office management and specialized insurance company correspondence, Kara manages all documentation flow, compliance, and internal scheduling to keep operations running smoothly.",
    image: teamKara,
  },
];

export function TeamSection() {
  return (
    <div className="section-padding bg-background">
      <div className="container-custom">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-accent mb-4">
            <Users className="w-5 h-5" />
            <span className="font-heading text-sm uppercase tracking-wider">
              Our Team
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            Meet the <span className="text-accent">Leadership</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            45+ years of combined experience. The trusted professionals behind Oklahoma's premier roofing company.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-xl transition-shadow group"
            >
              <div className="h-48 bg-section-alt flex items-center justify-center overflow-hidden">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-6">
                <h3 className="font-heading text-2xl uppercase mb-1">{member.name}</h3>
                <p className="text-accent font-heading uppercase text-sm mb-3">{member.role}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {member.description}
                </p>
                <a 
                  href={`mailto:${member.email}`}
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  {member.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
