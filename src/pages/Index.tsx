import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ServicesSection } from "@/components/ServicesSection";
import { WhyChooseUsSection } from "@/components/WhyChooseUsSection";
import { AboutSection } from "@/components/AboutSection";
import { TeamSection } from "@/components/TeamSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { StickyCallCTA } from "@/components/StickyCallCTA";
import { SectionArrow } from "@/components/SectionArrow";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section id="home">
          <Hero />
        </section>
        <TrustBar />
        <SectionArrow />
        <section id="services">
          <ServicesSection />
        </section>
        <SectionArrow />
        <WhyChooseUsSection />
        <SectionArrow />
        <section id="about">
          <AboutSection />
        </section>
        <SectionArrow />
        <section id="team">
          <TeamSection />
        </section>
        <SectionArrow />
        <section id="reviews">
          <TestimonialsSection />
        </section>
        <SectionArrow />
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
