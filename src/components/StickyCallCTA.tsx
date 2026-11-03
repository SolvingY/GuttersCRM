import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function StickyCallCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-primary-foreground/20 p-3">
      <div className="max-w-7xl mx-auto">
        {/* asChild: one focusable link instead of a button nested inside a link (WCAG 4.1.2) */}
        <Button 
          asChild
          variant="cta" 
          className="w-full text-sm sm:text-base md:text-lg py-2 px-4 leading-tight h-auto min-h-[40px]"
        >
          <Link to="/get-quote">Get your estimate within 24 Hours</Link>
        </Button>
      </div>
    </div>
  );
}
