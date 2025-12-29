import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ServicesSection } from "@/components/ServicesSection";
import { AboutPreview } from "@/components/AboutPreview";
import { ReviewSlider } from "@/components/ReviewSlider";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <section id="services">
          <ServicesSection />
        </section>
        <AboutPreview />
        <ReviewSlider />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
