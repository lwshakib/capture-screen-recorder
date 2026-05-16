import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import { SessionProvider } from "@/components/session-provider";

/**
 * Main Application Layout
 * Wrapping layout for all authenticated routes (Home, Library, Settings, etc.).
 * 
 * Features:
 * - Session Validation: Redirects unauthenticated users to /sign-in.
 * - SidebarProvider: Manages the collapsible navigation sidebar.
 * - SessionProvider: Context to share session data across client components.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    // Authenticate the session on every page load within this group
    const session = await auth.api.getSession({
        headers: await headers()
    })

    // Secure fallback: if no session, send to login
    if(!session) {
        redirect("/sign-in")
    }

  return (
    <SidebarProvider>
      {/* Provide session to children via React Context */}
      <SessionProvider session={session as any}>
      <AppSidebar />
      <SidebarInset>
        {/* Top navigation header */}
        <AppHeader />
        
        {/* Main nested content scroll area */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
      </SessionProvider>
    </SidebarProvider>
  );
}
