"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { useChat } from "@ai-sdk/react";
import { Loader2, MessageSquare } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// Lazy load VideoPlayer component
const VideoPlayer = lazy(() => import("@/components/VideoPlayer"));

interface VideoWithDetails {
  id: string;
  name: string | null;
  description: string | null;
  transcript: string | null;
  videoData: {
    url: string;
    m3u8Url?: string | null;
  };
  thumbnail: string | null;
  chapters: any; // Add chapters
  status: string;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  clerkId: string;
}

export default function VideoDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user;
  const videoId = params.id as string;

  const { messages, setMessages, sendMessage, status } = useChat();
  const isChatLoading = status === "streaming" || status === "submitted";

  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [video, setVideo] = useState<VideoWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideo = useCallback(async () => {
    if (!videoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${videoId}`);
      const data = await response.json();

      if (data.success && data.video) {
        setVideo(data.video);
      } else {
        throw new Error(data.error || "Video not found");
      }
    } catch (err) {
      console.error("Error fetching video:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch video");
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!videoId) return;
      try {
        const res = await fetch(`/api/chat?videoId=${videoId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          // Map database messages to useChat format
          const formattedMessages = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role.toLowerCase(),
            content: m.parts[0]?.text || "",
            parts: m.parts,
            createdAt: new Date(m.createdAt),
          }));
          setMessages(formattedMessages);
        }
      } catch (e) {
        console.error("Chat history load error:", e);
      }
    };
    loadChatHistory();
  }, [videoId, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !video) return;

    const text = chatInput.trim();
    setChatInput("");

    // In a real app, you would call your LLM here.
    // For now, we'll just store and display the user message.
    try {
      sendMessage(
        {
          role: "user", 
          parts:[{type: 'text', text:text}],
        },
        {
          body: {
            transcript: video.transcript,
            videoId: video.id,
          },
        }
      );
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
    );
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
    );
  }

  return (
    <div className="container mx-auto p-6 lg:p-10 space-y-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <Suspense fallback={<Skeleton className="aspect-video w-full" />}>
              <VideoPlayer
                videoData={video.videoData}
                thumbnail={video.thumbnail || ""}
                chapters={video.chapters}
              />
            </Suspense>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {video.name || "Untitled Video"}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-accent/20 overflow-hidden">
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
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-accent/5 border border-accent/10">
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
            className="w-full flex flex-col h-full min-h-[600px]"
          >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-accent/5 rounded-2xl border border-accent/10">
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
              className="flex-1 flex flex-col mt-4 min-h-0"
            >
              <Card className="flex-1 flex flex-col border-none bg-accent/5 shadow-none rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 px-6">
                  <CardTitle className="text-lg">Content Assistant</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                  <Conversation className="flex-1">
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
                                      );
                                    }
                                    return null;
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
                  </Conversation>                  <div className="p-6 pt-0 space-y-2">
                    <div className="relative">
                      <Textarea
                        placeholder="Ask about the content..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[100px] rounded-2xl bg-background border-accent/10 focus-visible:ring-primary/20 resize-none shadow-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute bottom-3 right-3 rounded-xl shadow-lg"
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

            <TabsContent value="transcript" className="flex-1 mt-4 min-h-0">
              <Card className="h-full border-none bg-accent/5 shadow-none rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Transcript</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-80px)]">
                  <ScrollArea className="h-full pr-4">
                    <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap py-4">
                      {video.transcript ||
                        "Transcript is not available for this video."}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
