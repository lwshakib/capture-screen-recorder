import React from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import Image from "next/image"
import { TextEffect } from "@workspace/ui/components/text-effect"
import { AnimatedGroup } from "@workspace/ui/components/animated-group"
import { HeroHeader } from "../layout/header"

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
} as const

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="absolute inset-0 top-56 -z-20 mask-b-from-35% mask-b-to-90% lg:top-32"
            >
              <Image
                src="https://ik.imagekit.io/lrigu76hy/tailark/night-background.jpg?updatedAt=1745733451120"
                alt="background"
                className="hidden size-full dark:block"
                width="3276"
                height="4095"
              />
            </AnimatedGroup>

            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"
            />

            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mt-0 lg:mr-auto">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="#link"
                    className="group mx-auto flex w-fit items-center gap-4 rounded-full border bg-muted p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 hover:bg-background dark:border-t-white/5 dark:shadow-zinc-950 dark:hover:border-t-border"
                  >
                    <span className="text-sm text-foreground">
                      Introducing Support for AI Models
                    </span>
                    <span className="block h-4 w-0.5 border-l bg-white dark:border-background dark:bg-zinc-700"></span>

                    <div className="size-6 overflow-hidden rounded-full bg-background duration-500 group-hover:bg-muted">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mx-auto mt-8 max-w-4xl text-5xl text-balance max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]"
                >
                  High-Performance Screen & Camera Recording
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-lg text-balance"
                >
                  Record your desktop, browser tab, or webcam instantly. Edit,
                  share, and synchronize your recordings to high-speed R2 cloud
                  storage seamlessly.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={1}
                    className="rounded-[calc(var(--radius-xl)+0.125rem)] border bg-foreground/10 p-0.5"
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl px-5 text-base"
                    >
                      <Link href="/home">
                        <span className="text-nowrap">Get Started</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5"
                  >
                    <Link href="/get-app">
                      <span className="text-nowrap">Download Apps</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div
                id="features"
                className="relative mt-8 -mr-56 overflow-hidden mask-b-from-55% px-2 sm:mt-12 sm:mr-0 md:mt-20"
              >
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-background p-4 shadow-lg ring-1 inset-shadow-2xs shadow-zinc-950/15 ring-background dark:inset-shadow-white/20">
                  <Image
                    className="relative hidden aspect-15/8 rounded-2xl bg-background dark:block"
                    src="/demos/dark_web_app_recorder.png"
                    alt="Capture Dark Theme App Screen"
                    width="2700"
                    height="1440"
                  />
                  <Image
                    className="relative z-2 aspect-15/8 rounded-2xl border border-border/25 dark:hidden"
                    src="/demos/light_web_app_recorder.png"
                    alt="Capture Light Theme App Screen"
                    width="2700"
                    height="1440"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
        <section id="solution" className="bg-background py-20 md:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <h2 className="text-3xl font-semibold text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
                The Complete Recording Solution
              </h2>
              <p className="text-lg text-muted-foreground">
                Capture everything that happens on your screen with studio-grade
                tools built directly into our web platform, desktop apps, and
                extension.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative rounded-2xl border bg-zinc-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100/50 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect width={20} height={14} x={2} y={3} rx={2} />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  Desktop Recording
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Low-CPU, GPU-accelerated recording apps for Windows, macOS,
                  and Linux. Perfectly captures high frame-rate desktop games,
                  tools, and presentations.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative rounded-2xl border bg-zinc-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100/50 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx={12} cy={12} r={10} />
                    <circle cx={12} cy={12} r={4} />
                    <path d="M12 8h8M12 16H4M12 12l4 7M12 12l-7-4" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  Browser Extension
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Start screen capture instantly from any browser tab with one
                  click. Ideal for quick debugging, bug reports, and product
                  design reviews.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative rounded-2xl border bg-zinc-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100/50 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                    <path d="m11.5 10-3 5h5l-3 5" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  R2 Cloud Backups
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Automated background uploads synchronize local recordings to
                  ultra-fast R2 cloud storage. Instantly generates sharing and
                  embed links.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group relative rounded-2xl border bg-zinc-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100/50 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="m22 8-6 4 6 4V8Z" />
                    <rect width={14} height={12} x={2} y={6} rx={2} />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  Webcam & Audio
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Overlay customizable webcam bubble feeds. Separate system,
                  microphone, and application audio tracks into isolated
                  high-fidelity channels.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group relative rounded-2xl border bg-zinc-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100/50 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="m12 3-10 5 10 5 10-5-10-5Z" />
                    <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  Shared Library
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Organize, tag, and search recordings within an interactive
                  team dashboard. Streamlines developer feedback and knowledge
                  base management.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group relative rounded-2xl border bg-zinc-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100/50 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path d="m9 11 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  Enterprise Security
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Bank-grade encryptions protect shared videos. Private links,
                  expiring sharing permissions, and custom password layers
                  guarantee total control.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
