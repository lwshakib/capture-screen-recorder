import FooterSection from "@/components/layout/footer"
import HeroSection from "@/components/marketing/hero-section"
import Pricing from "@/components/marketing/pricing"

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
  )
}
