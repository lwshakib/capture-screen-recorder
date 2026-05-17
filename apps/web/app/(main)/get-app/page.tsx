"use client";

import { Download } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Icon } from "@iconify/react";

export default function GetAppPage() {
  const extension = {
    title: "Chrome Extension",
    description: "Record your browser directly with our lightweight extension. Seamlessly integrated into your daily workflow.",
    icon: <Icon icon="logos:chrome" className="h-10 w-10" />,
    version: "v1.2.4",
    link: "#",
    type: "Extension",
  };

  const desktopApps = [
    {
      title: "Windows App",
      description: "Full-featured desktop recording for Windows 10 and 11.",
      icon: <Icon icon="logos:microsoft-windows-icon" className="h-8 w-8" />,
      version: "v2.0.1",
      link: "#",
    },
    {
      title: "macOS App",
      description: "Optimized recording for Intel and Apple Silicon Macs.",
      icon: <Icon icon="logos:apple" className="h-8 w-8" />,
      version: "v2.0.1",
      link: "#",
    },
    {
      title: "Linux App",
      description: "Native AppImage and Deb package for all major distributions.",
      icon: <Icon icon="logos:linux-tux" className="h-8 w-8" />,
      version: "v2.0.1",
      link: "#",
    },
  ];

  return (
    <div className="container mx-auto max-w-5xl p-6 lg:p-10 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Get Capture</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Take your recording experience to the next level with our native applications and browser tools.
        </p>
      </div>

      <div className="space-y-10">
        {/* Row 1: Extension */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Browser Extension</h2>
          <Card className="rounded-3xl border-accent/10 bg-accent/5 overflow-hidden group transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center gap-8 p-8">
                <div className="h-20 w-20 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {extension.icon}
                </div>
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <CardTitle className="text-2xl">{extension.title}</CardTitle>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit mx-auto md:mx-0 uppercase">
                      {extension.version}
                    </span>
                  </div>
                  <CardDescription className="text-base max-w-xl">
                    {extension.description}
                  </CardDescription>
                </div>
                <Button className="rounded-2xl px-8 h-12 bg-primary hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 shrink-0">
                  <Download className="mr-2 h-4 w-4" />
                  Install Extension
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Row 2: Desktop Apps */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">Desktop Applications</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {desktopApps.map((app) => (
              <Card key={app.title} className="rounded-3xl border-accent/10 bg-accent/5 hover:bg-accent/10 transition-all duration-300 shadow-sm hover:shadow-xl group flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {app.icon}
                  </div>
                  <div className="space-y-0.5">
                    <CardTitle className="text-lg">{app.title}</CardTitle>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
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
                  <Button variant="outline" className="w-full rounded-xl h-10 border-accent/20 hover:bg-white/5 font-medium transition-colors">
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Sync Banner */}
      <div className="bg-accent/5 rounded-3xl p-8 border border-accent/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-bold">Cloud Synchronization</h3>
            <p className="text-muted-foreground">
              All your recordings from any platform are automatically synced to your cloud library.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl px-8 border-accent/20">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}
