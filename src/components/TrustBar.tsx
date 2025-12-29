import { Shield, Award, Star } from "lucide-react";

const trustItems = [
  { icon: Award, text: "BBB A+ Rating" },
  { icon: Shield, text: "GAF Certified" },
  { icon: Star, text: "Veteran-Operated & Supported" },
  { icon: Award, text: "200+ 5-Star Reviews" },
  { icon: Shield, text: "7-Year Workmanship Guarantee" },
  { icon: Star, text: "OK House Bill 1940 Compliant" },
  { icon: Award, text: "Licensed & Insured" },
];

export function TrustBar() {
  return (
    <section className="bg-trust-bg text-background py-4 overflow-hidden">
      <div className="relative">
        <div className="flex animate-scroll">
          {[...trustItems, ...trustItems].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-8 whitespace-nowrap"
            >
              <item.icon className="w-5 h-5 text-accent" />
              <span className="font-heading text-sm uppercase tracking-wider">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
