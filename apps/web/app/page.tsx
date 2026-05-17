"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import FooterSection from "@/components/layout/footer"
import HeroSection from "@/components/marketing/hero-section"
import Pricing from "@/components/marketing/pricing"

/**
 * Home Page (Landing Page)
 */
export default function Home() {
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid toggling when user is typing in form controls
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as any).isContentEditable)
      ) {
        return
      }

      if (e.key === "d" || e.key === "D") {
        setTheme(theme === "dark" ? "light" : "dark")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [theme, setTheme])

  return (
    <div className="min-h-screen w-full">
      <HeroSection />
      <Pricing />
      <FooterSection />
    </div>
  )
}
