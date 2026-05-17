"use client"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "sonner"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { useChat } from "@ai-sdk/react"
import { Loader2, MessageSquare } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { formatDistanceToNow } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"

import { VideoPlayer } from "@/components/video/VideoPlayer"

interface VideoWithDetails {
  id: string
  title: string | null
  description: string | null
  path: string
  videoData: {
    url: string
  }
  duration: number | null
  privacy: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    image: string | null
  }
}

export default function VideoDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const session = authClient.useSession()
  const user = session.data?.user
  const videoId = params.id as string

  const { messages, setMessages, sendMessage, status } = useChat()
  const isChatLoading = status === "streaming" || status === "submitted"

  const [chatInput, setChatInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const [video, setVideo] = useState<VideoWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVideo = useCallback(async () => {
    if (!videoId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/videos/${videoId}`)
      const data = await response.json()

      if (data.success && data.video) {
        setVideo(data.video)
      } else {
        throw new Error(data.error || "Video not found")
      }
    } catch (err) {
      console.error("Error fetching video:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch video")
    } finally {
      setIsLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    fetchVideo()
  }, [fetchVideo])

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!videoId) return
      try {
        const res = await fetch(`/api/chat?videoId=${videoId}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.messages)) {
          // Map database messages to useChat format
          const formattedMessages = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role.toLowerCase(),
            content: m.parts[0]?.text || "",
            parts: m.parts,
            createdAt: new Date(m.createdAt),
          }))
          setMessages(formattedMessages)
        }
      } catch (e) {
        console.error("Chat history load error:", e)
      }
    }
    loadChatHistory()
  }, [videoId, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !video) return

    const text = chatInput.trim()
    setChatInput("")

    // In a real app, you would call your LLM here.
    // For now, we'll just store and display the user message.
    try {
      sendMessage(
        {
          role: "user",
          parts: [{ type: "text", text: text }],
        },
        {
          body: {
            transcript: "", // Transcript removed
            videoId: video.id,
          },
        }
      )
    } catch (e) {
      console.error("Failed to send message", e)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-full min-h-[500px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="container mx-auto p-6">
        <Alert
          variant="destructive"
          className="rounded-2xl border-none bg-destructive/10"
        >
          <AlertDescription className="flex items-center justify-between">
            <span>{error || "Video not found"}</span>
            <Button
              onClick={() => router.push("/library")}
              variant="outline"
              className="rounded-xl"
            >
              Back to Library
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Video Player Section */}
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <Suspense fallback={<Skeleton className="aspect-video w-full" />}>
              <VideoPlayer
                videoData={video.videoData}
                initialDuration={video.duration}
                thumbnail={""}
              />
            </Suspense>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {video.title || "Untitled Video"}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 overflow-hidden rounded-full bg-accent/20">
                      {video.user.image && (
                        <img
                          src={video.user.image}
                          alt={video.user.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <span>{video.user.name}</span>
                  </div>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(video.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span>•</span>
                  <Select
                    defaultValue={video.privacy}
                    onValueChange={async (value) => {
                      try {
                        const res = await fetch(`/api/videos/${video.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ privacy: value }),
                        })
                        if (!res.ok) throw new Error("Failed to update privacy")
                        toast.success(`Video is now ${value.toLowerCase()}`)
                        setVideo({ ...video, privacy: value })
                      } catch (e) {
                        toast.error("Failed to update privacy")
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-[100px] rounded-lg border-none bg-accent/10 text-xs font-medium">
                      <SelectValue placeholder="Privacy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-accent/10 bg-accent/5 p-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {video.description || "No description provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="lg:col-span-1">
          <Tabs
            defaultValue="chat"
            className="flex h-full min-h-[600px] w-full flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-2xl border border-accent/10 bg-accent/5 p-1">
              <TabsTrigger
                value="chat"
                className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="transcript"
                className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                Transcript
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="chat"
              className="mt-4 flex min-h-0 flex-1 flex-col"
            >
              <Card className="flex flex-1 flex-col overflow-hidden rounded-2xl border-none bg-accent/5 shadow-none">
                <CardHeader className="px-6 pb-3">
                  <CardTitle className="text-lg">Content Assistant</CardTitle>
                </CardHeader>
                <CardContent className="relative flex min-h-0 flex-1 flex-col p-0">
                  {/* Unavailable Overlay */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-3 bg-background/60 p-6 text-center backdrop-blur-[2px]">
                    <div className="rounded-full bg-primary/10 p-3">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">
                      AI Assistant Unavailable
                    </h3>
                    <p className="max-w-[240px] text-sm text-muted-foreground">
                      This service is not available right now. We are working on
                      bringing AI analysis to your videos soon.
                    </p>
                  </div>
                  <Conversation className="pointer-events-none flex-1 opacity-20">
                    <ScrollArea className="h-[400px] px-6 py-4">
                      <ConversationContent>
                        {isChatLoading && messages.length === 0 ? (
                          <div className="space-y-4">
                            <Message from="user">
                              <MessageContent>
                                <Skeleton className="h-4 w-48" />
                              </MessageContent>
                            </Message>
                            <Message from="assistant">
                              <MessageContent>
                                <Skeleton className="h-4 w-64" />
                              </MessageContent>
                            </Message>
                          </div>
                        ) : messages.length === 0 ? (
                          <ConversationEmptyState
                            title="Ask anything about this video"
                            description="I can help you understand the content, summarize key points, or find specific information."
                            icon={
                              <MessageSquare className="size-12 opacity-20" />
                            }
                          />
                        ) : (
                          messages.map((m: any) => (
                            <Message key={m.id} from={m.role}>
                              <MessageContent>
                                {m.parts && Array.isArray(m.parts) ? (
                                  m.parts.map((part: any, i: number) => {
                                    if (
                                      part.type === "text" ||
                                      (part.text && !part.type)
                                    ) {
                                      return (
                                        <MessageResponse key={i}>
                                          {part.text}
                                        </MessageResponse>
                                      )
                                    }
                                    return null
                                  })
                                ) : (
                                  <MessageResponse>{m.content}</MessageResponse>
                                )}
                              </MessageContent>
                            </Message>
                          ))
                        )}
                      </ConversationContent>
                      <ConversationScrollButton />
                    </ScrollArea>
                  </Conversation>{" "}
                  <div className="space-y-2 p-6 pt-0">
                    <div className="relative">
                      <Textarea
                        placeholder="Ask about the content..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="min-h-[100px] resize-none rounded-2xl border-accent/10 bg-background shadow-sm focus-visible:ring-primary/20"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-3 bottom-3 rounded-xl shadow-lg"
                      >
                        {isChatLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript" className="mt-4 min-h-0 flex-1">
              <Card className="h-full overflow-hidden rounded-2xl border-none bg-accent/5 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Transcript</CardTitle>
                </CardHeader>
                <CardContent className="relative h-[calc(100%-80px)]">
                  {/* Unavailable Overlay */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-3 bg-background/60 p-6 text-center backdrop-blur-[2px]">
                    <h3 className="text-lg font-semibold">
                      Transcription Unavailable
                    </h3>
                    <p className="max-w-[240px] text-sm text-muted-foreground">
                      This service is not available right now.
                    </p>
                  </div>

                  <ScrollArea className="pointer-events-none h-full pr-4 opacity-20">
                    <div className="py-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      Transcript is not available for this video.
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
