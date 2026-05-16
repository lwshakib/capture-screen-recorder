import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import Pricing from "@/components/pricing";
import Image from "next/image";

/**
 * Home Page (Landing Page)
 * The main entry point for unauthenticated users.
 * Displays the Hero section, Pricing, and Footer.
 */
export default function Home() {
  return (
    <div className="min-h-screen w-full">
      {/* Primary call to action and product intro */}
      <HeroSection />

      {/* Subscription plans and pricing details */}
      <Pricing />

      {/* Footer with links and copyright */}
      <FooterSection />
    </div>
  );
}
