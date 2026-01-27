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

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
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
