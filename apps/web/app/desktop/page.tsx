import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import AutoRedirect from "./auto-redirect";

/**
 * ElectronAuth Page
 * This page handles the "handshake" between the web application and the desktop app.
 * It ensures the user is authenticated on the web and then redirects back to the desktop
 * app using a custom protocol (capture://) along with the session token.
 */
export default async function ElectronAuthPage() {
    // 1. Check if the user is authenticated using Better Auth
    const session = await auth.api.getSession({
        headers: await headers()
    });

    // 2. If not authenticated, redirect to the login page
    // We append a callbackURL so the user returns here after signing in
    if (!session) {
        return redirect("/sign-in?callbackURL=/desktop");
    }

    // 3. If authenticated, show a "handover" UI
    // The session object from Better Auth contains the 'session.token' which acts as the Bearer Token
    const sessionToken = session.session.token;
    const desktopDeepLink = `capture://auth?token=${sessionToken}`;

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <AutoRedirect url={desktopDeepLink} />
            <Card className="w-full max-w-md border-2 border-primary/20 shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">Authenticating Desktop App</CardTitle>
                    <CardDescription>
                        You are signed in as <span className="font-medium text-foreground">{session.user.email}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6 pt-4">
                    <div className="p-4 rounded-full bg-primary/10">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="48" 
                            height="48" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="text-primary animate-pulse"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        </svg>
                    </div>
                    
                    <p className="text-center text-sm text-muted-foreground">
                        We are redirecting you to the desktop app. If nothing happens, click the button below.
                    </p>

                    <Button asChild size="lg" className="w-full font-semibold shadow-lg hover:shadow-primary/20 transition-all">
                        <a href={desktopDeepLink}>
                            Proceed to Capture Desktop
                        </a>
                    </Button>
                    
                    <p className="text-[10px] text-muted-foreground italic">
                        If nothing happens, ensure you have the Capture Desktop app installed.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
