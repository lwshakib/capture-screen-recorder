"use client";

import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"
import { SearchInput } from "@/components/common/search-input"
import { UploadVideoDialog } from "@/components/video/upload-video-dialog"
import { RecordVideoDialog } from "@/components/video/record-video-dialog"
import { Button } from "@workspace/ui/components/button"
import { Upload, Video } from "lucide-react"
import { useState } from "react"
import { UserMenu } from "@/components/common/user-menu"
import { authClient } from "@/lib/auth-client"

export function AppHeader() {
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const { data: session } = authClient.useSession()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 justify-between border-b border-border/40 px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 h-9 w-9" />
        <Separator orientation="vertical" className="h-6 opacity-20" />
        <SearchInput />
      </div>
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 h-9 rounded-xl border-accent/20"
          onClick={() => setIsUploadDialogOpen(true)}
        >
          <Upload className="h-4 w-4" />Upload Video
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-2 h-9 rounded-xl border-accent/20" onClick={() => setIsRecordDialogOpen(true)}>
          <Video className="h-4 w-4" />Record Video
        </Button>
        {session?.user && <UserMenu user={session.user} />}
      </div>
      <UploadVideoDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />
      <RecordVideoDialog
        open={isRecordDialogOpen}
        onOpenChange={setIsRecordDialogOpen}
      />
    </header>
  )
}


