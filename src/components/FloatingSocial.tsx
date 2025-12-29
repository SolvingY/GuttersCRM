import { useState } from "react";
import { Phone, Instagram, Facebook, Star, ChevronLeft, ChevronRight } from "lucide-react";

const socialLinks = [
  {
    icon: Phone,
    label: "Call Us",
    href: "tel:+14055551234",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    icon: Instagram,
    label: "Instagram",
    href: "https://www.instagram.com/next_generation_roofing/",
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500",
  },
  {
    icon: Facebook,
    label: "Facebook",
    href: "https://www.facebook.com/people/Next-Generation-Roofing/100064277643225/?mibextid=LQQJ4d",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    icon: Star,
    label: "Google Reviews",
    href: "https://share.google/APxY30i8K9jflKJOx",
    color: "bg-red-500 hover:bg-red-600",
  },
];

export function FloatingSocial() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-row-reverse items-center"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Toggle Button - always flush right */}
      <button
        className="bg-accent text-accent-foreground p-2 rounded-l-lg shadow-lg transition-all duration-300"
        aria-label={isExpanded ? "Collapse social links" : "Expand social links"}
      >
        {isExpanded ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Social Links */}
      <div
        className={`flex flex-col gap-2 bg-background/95 backdrop-blur-sm p-2 rounded-l-lg shadow-xl transition-all duration-300 ${
          isExpanded ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("tel:") ? "_self" : "_blank"}
            rel="noopener noreferrer"
            className={`${link.color} text-white p-3 rounded-lg flex items-center gap-3 transition-all duration-200 shadow-md group`}
            aria-label={link.label}
          >
            <link.icon className="w-5 h-5" />
            <span className="font-heading text-sm uppercase tracking-wide whitespace-nowrap">
              {link.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}