import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function StickyCallCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-primary-foreground/20 p-3">
      <div className="max-w-7xl mx-auto">
        <Link to="/get-quote">
          <Button 
            variant="cta" 
            className="w-full text-sm sm:text-base md:text-lg py-2 px-4 leading-tight h-auto min-h-[40px]"
          >
            Get your estimate within 24 Hours
          </Button>
        </Link>
      </div>
    </div>
  );
}
