import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyCallCTA } from "@/components/StickyCallCTA";
import heroRoof from "@/assets/hero-roof.jpg";
import { MessageSquare, ClipboardList, Hammer, CheckCircle, Shield, Phone } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "A Straightforward Conversation",
    description: "We start with an honest discussion about your roofing needs, concerns, and goals. No high-pressure sales tactics—just a real conversation about how we can help protect your home or business.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Detailed Inspection & Planning",
    description: "Our certified inspectors thoroughly document your roof's condition with photos and detailed reports. We create a comprehensive scope of work, outline timelines, and discuss material options tailored to your property.",
  },
  {
    number: "03",
    icon: Shield,
    title: "Insurance Advocacy & Support",
    description: "If you're filing an insurance claim, we fight for every dollar you deserve. We meet with adjusters, document all damage, and handle the complex paperwork so you can focus on what matters.",
  },
  {
    number: "04",
    icon: Hammer,
    title: "Clean, Professional Execution",
    description: "Our NGR-supervised crews work with precision and respect for your property. We maintain a clean, organized jobsite and communicate throughout the entire installation process.",
  },
  {
    number: "05",
    icon: CheckCircle,
    title: "Quality Control & Walkthrough",
    description: "Before we consider the job complete, our quality control team inspects every detail. We walk through the finished work with you and confirm everything meets our high standards and your expectations.",
  },
  {
    number: "06",
    icon: Shield,
    title: "Warranty & Ongoing Support",
    description: "Your new roof is registered with manufacturer warranties and backed by our workmanship guarantee. We stand behind our work and are always available if you have questions down the road.",
  },
];

export default function WhyChooseUs() {
  return (
    <>
      <Helmet>
        <title>Why Choose Us | Next Gen Roofing</title>
        <meta name="description" content="Discover the Next Gen Roofing experience. From honest conversations to quality craftsmanship, learn what sets us apart as Oklahoma's trusted roofing contractor." />
      </Helmet>
      
      <Header />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroRoof})` }}
        />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative z-10 container-custom text-center text-primary-foreground">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase mb-4">
            Why Choose Us
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            The Next Gen Roofing Experience
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              We believe that great outcomes start with a great process. Whether we're replacing a residential roof or restoring a commercial property, our approach stays the same: be honest, be thorough, and do the work right. Here's what you can expect when you partner with Next Gen Roofing.
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="pb-20 md:pb-28 bg-background">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Sticky Title */}
            <div className="lg:sticky lg:top-32 lg:h-fit">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase text-foreground mb-6">
                The Next Gen<br />
                <span className="text-accent">Experience</span>
              </h2>
              <p className="text-muted-foreground max-w-md">
                From the first phone call to the final walkthrough, every step is designed to give you confidence, clarity, and a roof that lasts.
              </p>
              <a
                href="tel:+14058556500"
                className="inline-flex items-center gap-2 mt-8 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading uppercase text-sm tracking-wider hover:bg-accent/90 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Us Today
              </a>
            </div>

            {/* Right Column - Steps */}
            <div className="space-y-6">
              {steps.map((step) => (
                <div 
                  key={step.number}
                  className="bg-card border border-border rounded-lg p-6 md:p-8 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                        <step.icon className="w-6 h-6 text-accent-foreground" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-accent font-heading text-sm">{step.number}</span>
                        <h3 className="font-heading uppercase text-lg text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-heading uppercase text-primary-foreground mb-4">
            Ready to Experience the Difference?
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join thousands of Oklahoma homeowners and businesses who trust Next Gen Roofing for their roofing needs.
          </p>
          <a
            href="/#contact"
            className="inline-block bg-accent text-accent-foreground px-8 py-4 rounded-lg font-heading uppercase tracking-wider hover:bg-accent/90 transition-colors"
          >
            Get Your Free Estimate
          </a>
        </div>
      </section>

      <Footer />
      <StickyCallCTA />
    </>
  );
}
