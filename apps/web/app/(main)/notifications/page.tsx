"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCircle2, Circle, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"

interface Notification {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
      }
    } catch (e) {
      toast.error("Failed to mark as read")
    }
  }

  if (isLoading) {
    return <div className="p-10 text-center">Loading notifications...</div>
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-10 p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Notifications</h1>
          <p className="text-lg text-muted-foreground">
            Stay updated with your latest activities.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="rounded-3xl border-2 border-dashed border-accent/10 py-20">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/5">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold">No notifications</h3>
              <p className="max-w-xs text-center text-muted-foreground">
                We'll notify you when something important happens.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "rounded-2xl border-accent/10 transition-all duration-300",
                notification.isRead
                  ? "bg-transparent opacity-60"
                  : "border-primary/10 bg-accent/5 shadow-sm"
              )}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div
                  className={cn(
                    "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    notification.isRead ? "bg-muted" : "bg-primary/10"
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "h-5 w-5",
                      notification.isRead
                        ? "text-muted-foreground"
                        : "text-primary"
                    )}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      notification.isRead
                        ? "text-muted-foreground"
                        : "font-medium text-foreground"
                    )}
                  >
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Circle className="h-3 w-3 fill-primary text-primary" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
