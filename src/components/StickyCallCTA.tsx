import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StickyCallCTA() {
  const scrollToContact = () => {
    const element = document.querySelector("#contact");
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-primary-foreground/20 p-3">
      <div className="max-w-7xl mx-auto">
        <Button 
          variant="cta" 
          className="w-full text-xs sm:text-sm md:text-base lg:text-lg py-3 sm:py-4 px-3 sm:px-4 leading-snug whitespace-normal h-auto min-h-[48px]"
          onClick={scrollToContact}
        >
          💲💲 Save Thousands on Insurance: Click to Qualify for an IR Shingle Upgrade Before You Renew! 💲💲
        </Button>
      </div>
    </div>
  );
}
