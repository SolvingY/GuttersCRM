import { Button } from "@/components/ui/button";

export function StickyCallCTA() {
  const handleCall = () => {
    window.location.href = "tel:4057248092";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-primary-foreground/20 p-3">
      <div className="max-w-7xl mx-auto">
        <Button 
          variant="cta" 
          className="w-full text-[10px] sm:text-sm md:text-base lg:text-lg py-2 sm:py-4 px-2 sm:px-4 leading-tight h-auto min-h-[48px] flex flex-col items-center gap-0.5"
          onClick={handleCall}
        >
          <span className="flex items-center gap-1 flex-wrap justify-center">
            <span className="text-lg sm:text-2xl md:text-3xl">$</span> 
            <span className="text-green-400">Save Thousands on Insurance:</span>
          </span>
          <span>Click to Qualify for an IR Shingle</span>
          <span>(Upgrade Before You Renew)!</span>
        </Button>
      </div>
    </div>
  );
}
