import { useState } from "react";
import { Shield, Award, Star, Pause, Play } from "lucide-react";

const trustItems = [
  { icon: Award, text: "BBB A+ Rating" },
  { icon: Shield, text: "GAF Certified" },
  { icon: Star, text: "Veteran-Operated & Supported" },
  { icon: Award, text: "200+ 5-Star Reviews" },
  { icon: Shield, text: "Licensed & Insured" },
  { icon: Star, text: "45+ Years Combined Experience" },
];

/** Scrolling trust-badge banner; visitors can pause it, and it stops for reduced-motion users (WCAG 2.2.2). */
export function TrustBar() {
  const [paused, setPaused] = useState(false);

  return (
    <section aria-label="Credentials" className="bg-trust-bg text-background py-4 overflow-hidden">
      <div className="relative">
        <div
          className={`flex animate-scroll hover:[animation-play-state:paused] motion-reduce:flex-wrap motion-reduce:justify-center ${
            paused ? "[animation-play-state:paused]" : ""
          }`}
        >
          {[...trustItems, ...trustItems].map((item, index) => (
            <div
              key={index}
              // The second copy only exists to make the loop seamless; hide it from screen readers
              aria-hidden={index >= trustItems.length ? true : undefined}
              className={`flex items-center gap-3 px-8 whitespace-nowrap ${
                index >= trustItems.length ? "motion-reduce:hidden" : ""
              }`}
            >
              <item.icon className="w-5 h-5 text-accent" />
              <span className="font-heading text-sm uppercase tracking-wider">
                {item.text}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="motion-reduce:hidden absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-trust-bg text-background ring-1 ring-background/40 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span className="sr-only">{paused ? "Play" : "Pause"} scrolling credentials</span>
        </button>
      </div>
    </section>
  );
}
