"use client"

import { Download } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Icon } from "@iconify/react"
import {
  DOWNLOAD_WINDOWS,
  DOWNLOAD_MAC,
  DOWNLOAD_LINUX,
  DOWNLOAD_CHROME,
} from "@/lib/constants"

export default function GetAppPage() {
  const extension = {
    title: "Chrome Extension",
    description:
      "Record your browser directly with our lightweight extension. Seamlessly integrated into your daily workflow.",
    icon: <Icon icon="logos:chrome" className="h-10 w-10" />,
    version: "v1.0.0",
    link: DOWNLOAD_CHROME,
    type: "Extension",
  }

  const desktopApps = [
    {
      title: "Windows App",
      description: "Full-featured desktop recording for Windows 10 and 11.",
      icon: <Icon icon="logos:microsoft-windows-icon" className="h-8 w-8" />,
      version: "v1.0.0",
      link: DOWNLOAD_WINDOWS,
    },
    {
      title: "macOS App",
      description: "Optimized recording for Intel and Apple Silicon Macs.",
      icon: <Icon icon="logos:apple" className="h-8 w-8" />,
      version: "v1.0.0",
      link: DOWNLOAD_MAC,
    },
    {
      title: "Linux App",
      description:
        "Native AppImage and Deb package for all major distributions.",
      icon: <Icon icon="logos:linux-tux" className="h-8 w-8" />,
      version: "v1.0.0",
      link: DOWNLOAD_LINUX,
    },
  ]

  return (
    <div className="container mx-auto max-w-5xl space-y-12 p-6 lg:p-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Get Capture</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Take your recording experience to the next level with our native
          applications and browser tools.
        </p>
      </div>

      <div className="space-y-10">
        {/* Row 1: Extension */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground/70 uppercase">
            Browser Extension
          </h2>
          <Card className="group overflow-hidden rounded-3xl border-accent/10 bg-accent/5 transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-0">
              <div className="flex flex-col items-center gap-8 p-8 md:flex-row">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                  {extension.icon}
                </div>
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <CardTitle className="text-2xl">
                      {extension.title}
                    </CardTitle>
                    <span className="mx-auto w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase md:mx-0">
                      {extension.version}
                    </span>
                  </div>
                  <CardDescription className="max-w-xl text-base">
                    {extension.description}
                  </CardDescription>
                </div>
                <Button
                  asChild
                  className="h-12 shrink-0 rounded-2xl bg-primary px-8 font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90"
                >
                  <a href={extension.link}>
                    <Download className="mr-2 h-4 w-4" />
                    Install Extension
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Row 2: Desktop Apps */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground/70 uppercase">
            Desktop Applications
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {desktopApps.map((app) => (
              <Card
                key={app.title}
                className="group flex flex-col rounded-3xl border-accent/10 bg-accent/5 shadow-sm transition-all duration-300 hover:bg-accent/10 hover:shadow-xl"
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    {app.icon}
                  </div>
                  <div className="space-y-0.5">
                    <CardTitle className="text-lg">{app.title}</CardTitle>
                    <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      {app.version}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <CardDescription className="text-sm leading-relaxed">
                    {app.description}
                  </CardDescription>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 w-full rounded-xl border-accent/20 font-medium transition-colors hover:bg-white/5"
                  >
                    <a href={app.link}>
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Download
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Sync Banner */}
      <div className="rounded-3xl border border-accent/10 bg-accent/5 p-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold">Cloud Synchronization</h3>
            <p className="text-muted-foreground">
              All your recordings from any platform are automatically synced to
              your cloud library.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-accent/20 px-8"
          >
            Learn More
          </Button>
        </div>
      </div>
    </div>
  )
}
