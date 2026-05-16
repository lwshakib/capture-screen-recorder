"use client";

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { SearchInput } from "@/components/search-input"
import { UploadVideoDialog } from "@/components/upload-video-dialog"
import { RecordVideoDialog } from "@/components/record-video-dialog"
import { Button } from "@/components/ui/button"
import { Upload, Video } from "lucide-react"
import { useState } from "react"
import { UserMenu } from "@/components/user-menu"
import { authClient } from "@/lib/auth-client"

export function AppHeader() {
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false)
  const { data: session } = authClient.useSession()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 justify-between">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <SearchInput />
      </div>
      <div className="flex items-center gap-2 mr-4">
        <UploadVideoDialog
          trigger={<Button variant="outline" size="sm" className="flex items-center gap-2"><Upload className="h-4 w-4" />Upload Video</Button>}
        />
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setIsRecordDialogOpen(true)}>
          <Video className="h-4 w-4" />Record Video
        </Button>
        {session?.user && <UserMenu user={session.user} />}
      </div>
      <RecordVideoDialog
        open={isRecordDialogOpen}
        onOpenChange={setIsRecordDialogOpen}
      />
    </header>
  )
}

