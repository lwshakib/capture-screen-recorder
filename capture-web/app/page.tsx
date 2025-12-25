import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import Pricing from "@/components/pricing";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen w-full">
      <HeroSection />
      <Pricing />
      <FooterSection />
    </div>
  );
}
