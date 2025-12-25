import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import { SessionProvider } from "@/components/session-provider";


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
   const session = await auth.api.getSession({
        headers: await headers()
    })
    if(!session) {
        redirect("/sign-in")
    }
  return (
    <SidebarProvider>
      <SessionProvider session={session as any}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
      </SessionProvider>
    </SidebarProvider>
  );
}
