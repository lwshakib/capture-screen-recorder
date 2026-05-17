import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { UserMenu } from "@/components/common/user-menu"
import { SessionProvider } from "@/components/auth/session-provider"

/**
 * Main Application Layout
 * Wrapping layout for all authenticated routes (Home, Library, Settings, etc.).
 *
 * Features:
 * - Session Validation: Redirects unauthenticated users to /sign-in.
 * - SidebarProvider: Manages the collapsible navigation sidebar.
 * - TooltipProvider: Required for Radix UI Tooltips used in sidebar and components.
 * - SessionProvider: Context to share session data across client components.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authenticate the session on every page load within this group
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Secure fallback: if no session, send to login
  if (!session) {
    redirect("/sign-in")
  }

  return (
    <SidebarProvider>
      <TooltipProvider>
        {/* Provide session to children via React Context */}
        <SessionProvider session={session as any}>
          <AppSidebar />
          <SidebarInset>
            {/* Top navigation header */}
            <AppHeader />

            {/* Main nested content scroll area */}
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {children}
            </div>
          </SidebarInset>
        </SessionProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
