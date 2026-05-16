import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import Pricing from "@/components/pricing";

/**
 * Home Page (Landing Page)
 */
export default function Home() {
  return (
    <div className="min-h-screen w-full">
      <HeroSection />
      <Pricing />
      <FooterSection />
    </div>
  );
}
