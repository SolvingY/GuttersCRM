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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-primary-foreground/20 p-3 md:hidden">
      <div className="flex gap-3">
        <a href="tel:4057248092" className="flex-1">
          <Button variant="cta" className="w-full gap-2">
            <Phone className="w-4 h-4" />
            Call Now
          </Button>
        </a>
        <Button 
          variant="nav" 
          className="flex-1"
          onClick={scrollToContact}
        >
          Get Estimate
        </Button>
      </div>
    </div>
  );
}
