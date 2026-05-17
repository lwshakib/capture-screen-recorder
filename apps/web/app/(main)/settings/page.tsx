"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { Monitor, Moon, Sun } from "lucide-react"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [defaultPrivacy, setDefaultPrivacy] = useState("PRIVATE")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/user/settings")
        if (res.ok) {
          const data = await res.json()
          setDefaultPrivacy(data.defaultPrivacy)
        }
      } catch (e) {
        console.error("Failed to fetch settings", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSavePrivacy = async (value: string) => {
    setDefaultPrivacy(value)
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPrivacy: value }),
      })
      if (res.ok) {
        toast.success("Default privacy updated")
      }
    } catch (e) {
      toast.error("Failed to update privacy")
    }
  }

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme)
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      })
    } catch (e) {
      console.error("Failed to save theme preference", e)
    }
  }

  if (isLoading) {
    return <div className="p-10 text-center">Loading settings...</div>
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-10 p-6 lg:p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account preferences and application settings.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Appearance */}
        <Card className="rounded-2xl border-accent/10 shadow-sm">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks on your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Theme</Label>
              <RadioGroup
                defaultValue={theme}
                onValueChange={handleThemeChange}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="light"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 peer-data-[state=checked]:border-primary hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                  >
                    <Sun className="mb-3 h-6 w-6" />
                    Light
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="dark"
                    id="dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="dark"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 peer-data-[state=checked]:border-primary hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                  >
                    <Moon className="mb-3 h-6 w-6" />
                    Dark
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="system"
                    id="system"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="system"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 peer-data-[state=checked]:border-primary hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                  >
                    <Monitor className="mb-3 h-6 w-6" />
                    System
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Video Defaults */}
        <Card className="rounded-2xl border-accent/10 shadow-sm">
          <CardHeader>
            <CardTitle>Video Defaults</CardTitle>
            <CardDescription>
              Set the default behavior for your new recordings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label>Default Privacy</Label>
                <p className="text-sm text-muted-foreground">
                  Choose who can see your videos by default.
                </p>
              </div>
              <Select value={defaultPrivacy} onValueChange={handleSavePrivacy}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
