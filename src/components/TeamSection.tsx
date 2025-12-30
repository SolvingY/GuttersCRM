import { useState } from "react";
import { Users, Mail, ChevronDown, Briefcase, Rocket, Heart, Trophy } from "lucide-react";
import teamRob from "@/assets/team-rob.png";
import teamJonathan from "@/assets/team-jonathan.png";
import teamDustin from "@/assets/team-dustin.png";
import teamKara from "@/assets/team-kara.png";

const teamMembers = [
  {
    name: "Rob Baker",
    role: "Owner",
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
    name: "Kara Jameson",
    role: "Office Manager",
    email: "k.jameson@oknextgen.com",
    description: "With 10+ years of experience in office management and specialized insurance company correspondence, Kara manages all documentation flow, compliance, and internal scheduling to keep operations running smoothly.",
    image: teamKara,
  },
  {
    name: "Dustin Jameson",
    role: "Lead Project Manager",
    email: "D.Jameson@oknextgen.com",
    description: "As a veteran, Dustin brings unmatched professionalism and discipline to every project. A founding member of Next Generation Roofing, he leads our project management team with exceptional client communication, seamless coordination, and a commitment to delivering outstanding results on every job.",
    image: teamDustin,
  },
];

const joinBenefits = [
  {
    icon: Rocket,
    title: "Growth Opportunities",
    description: "We invest in our people with ongoing training, mentorship, and clear paths for advancement.",
  },
  {
    icon: Heart,
    title: "Team Culture",
    description: "Join a close-knit, supportive team that celebrates wins together and has each other's backs.",
  },
  {
    icon: Trophy,
    title: "Competitive Pay",
    description: "Earn what you deserve with competitive compensation, bonuses, and performance incentives.",
  },
  {
    icon: Briefcase,
    title: "Work-Life Balance",
    description: "We respect your time and believe that happy team members deliver the best results.",
  },
];

interface TeamMember {
  name: string;
  role: string;
  email?: string;
  description: string;
  image: string;
}

function TeamMemberCard({ member }: { member: TeamMember }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-xl transition-shadow group">
      <div className="h-48 bg-section-alt flex items-center justify-center overflow-hidden">
        <img 
          src={member.image} 
          alt={member.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="p-6">
        <h3 className="font-heading text-2xl uppercase mb-1">{member.name}</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-accent font-heading uppercase text-sm mb-3 hover:text-accent/80 transition-colors"
        >
          {member.role}
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </button>
        
        <div 
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            {member.description}
          </p>
          {member.email && (
            <a 
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <Mail className="w-4 h-4" />
              {member.email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamSection() {
  const [isJoinExpanded, setIsJoinExpanded] = useState(false);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>

        {/* Join The Team Dropdown */}
        <div className="mt-16">
          <button
            onClick={() => setIsJoinExpanded(!isJoinExpanded)}
            className="w-full bg-card border border-border rounded-lg p-6 flex items-center justify-between hover:border-accent transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <h3 className="font-heading text-2xl uppercase">Join The Team</h3>
                <p className="text-muted-foreground text-sm">Discover what it's like to be part of Next Generation Roofing</p>
              </div>
            </div>
            <ChevronDown 
              className={`w-6 h-6 text-accent transition-transform duration-300 ${isJoinExpanded ? 'rotate-180' : ''}`} 
            />
          </button>

          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isJoinExpanded ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-card border border-border rounded-lg p-8">
              <div className="max-w-3xl mx-auto text-center mb-8">
                <h4 className="font-heading text-xl uppercase text-accent mb-4">Build Your Future With Us</h4>
                <p className="text-muted-foreground leading-relaxed">
                  At Next Generation Roofing, we're more than just a roofing company—we're a family of driven, 
                  passionate professionals who take pride in protecting Oklahoma homes and businesses. We're a young, 
                  energetic organization that values hustle, integrity, and having fun while doing great work. 
                  Whether you're experienced in roofing or looking to start a rewarding new career, we want to hear from you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {joinBenefits.map((benefit) => (
                  <div key={benefit.title} className="text-center p-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <benefit.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h5 className="font-heading uppercase text-sm mb-2">{benefit.title}</h5>
                    <p className="text-muted-foreground text-xs leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <p className="text-muted-foreground mb-4">Ready to join a winning team?</p>
                <a 
                  href="mailto:careers@oknextgen.com"
                  className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading uppercase text-sm hover:bg-accent/90 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send Your Resume
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}