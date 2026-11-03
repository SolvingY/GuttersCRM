import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ServicesSection } from "@/components/ServicesSection";
import { WhyChooseUsSection } from "@/components/WhyChooseUsSection";
import { AboutSection } from "@/components/AboutSection";
import { TeamSection } from "@/components/TeamSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { InstagramGallery } from "@/components/InstagramGallery";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { StickyCallCTA } from "@/components/StickyCallCTA";
import { usePageTitle } from "@/hooks/usePageTitle";

const Index = () => {
  usePageTitle("Next Generation Roofing | Roofing Oklahoma City | Commercial Roofing OKC | Gutter Installation Edmond");

  return (
    <div className="min-h-screen">
      {/* Skip link: first focusable element, visible on focus (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <section id="home">
          <Hero />
        </section>
        <TrustBar />
        <section id="services">
          <ServicesSection />
        </section>
        <WhyChooseUsSection />
        <section id="about">
          <AboutSection />
        </section>
        <section id="team">
          <TeamSection />
        </section>
        <section id="reviews">
          <TestimonialsSection />
        </section>
        <section id="instagram">
          <InstagramGallery />
        </section>
        <section id="contact">
          <ContactSection />
        </section>
      </main>
      <Footer />
      <StickyCallCTA />
    </div>
  );
};

export default Index;
