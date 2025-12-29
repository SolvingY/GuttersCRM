import { Button } from "@/components/ui/button";
import { Phone, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="bg-accent text-accent-foreground section-padding">
      <div className="container-custom">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase">
              Ready to Protect Your Home?
            </h2>
            <p className="text-accent-foreground/90 text-lg max-w-2xl">
              Get a free, no-obligation roof inspection from Oklahoma's most trusted roofing team. We're here to help.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="tel:4057248092">
              <Button
                variant="default"
                size="xl"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Phone className="w-5 h-5" />
                Call (405) 724-8092
              </Button>
            </a>
            <a href="#quote">
              <Button
                variant="outline"
                size="xl"
                className="border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-accent"
              >
                Get Free Quote
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
