import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Check } from "lucide-react"

export default function Pricing() {
  return (
    <section id="pricing" className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-center text-4xl font-semibold lg:text-5xl">
            Pricing Plans for Every Creator
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose the perfect plan to capture, edit, share, and organize all of
            your high-definition recordings with lightning-fast cloud backups.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-3">
          {/* Free Plan */}
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="font-medium">Free</CardTitle>
              <span className="my-3 block text-2xl font-semibold">$0 / mo</span>
              <CardDescription className="text-sm">
                Perfect for quick sharing
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              <hr className="border-dashed" />
              <ul className="list-outside space-y-3 text-sm">
                {[
                  "5-minute max recording length",
                  "10GB high-speed cloud storage",
                  "Standard 720p resolution exports",
                  "Local MP4 exports & sharing link",
                  "Browser webcam & audio capture",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="size-3 text-zinc-900 dark:text-zinc-100" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button asChild variant="outline" className="w-full">
                <Link href="/home">Get Started</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative flex h-full flex-col !overflow-visible border-zinc-300 shadow-md ring-1 ring-zinc-200 dark:border-zinc-800 dark:ring-zinc-800">
            <span className="absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white ring-1 ring-zinc-200 dark:bg-zinc-100 dark:text-zinc-950 dark:ring-zinc-800">
              Most Popular
            </span>

            <CardHeader>
              <CardTitle className="font-medium text-zinc-900 dark:text-zinc-100">
                Pro
              </CardTitle>
              <span className="my-3 block text-2xl font-semibold">
                $12 / mo
              </span>
              <CardDescription className="text-sm">
                For professional creators
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              <hr className="border-dashed" />
              <ul className="list-outside space-y-3 text-sm">
                {[
                  "Unlimited recording length",
                  "250GB premium R2 cloud storage",
                  "Ultra-HD 4K resolution at 60fps",
                  "Dual track system & microphone audio",
                  "Native macOS, Windows & Linux apps",
                  "Chrome Extension fully unlocked",
                  "Custom player branding & styling",
                  "High-speed direct link sharing",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="size-3 text-zinc-900 dark:text-zinc-100" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button
                asChild
                className="w-full border-0 bg-zinc-900 font-medium text-white transition-all duration-200 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <Link href="/home">Upgrade to Pro</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Teams Plan */}
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="font-medium">Teams</CardTitle>
              <span className="my-3 block text-2xl font-semibold">
                $29 / mo
              </span>
              <CardDescription className="text-sm">
                For collaborative teams
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              <hr className="border-dashed" />
              <ul className="list-outside space-y-3 text-sm">
                {[
                  "Everything in Pro Plan",
                  "Unlimited collaborative cloud storage",
                  "Multi-user shared team video library",
                  "Custom domain sharing pages",
                  "Advanced team analytics dashboard",
                  "Custom SSO & SAML authentication",
                  "Dedicated account manager",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="size-3 text-zinc-900 dark:text-zinc-100" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="mt-auto">
              <Button asChild variant="outline" className="w-full">
                <Link href="/home">Contact Sales</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
