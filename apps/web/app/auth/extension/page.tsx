import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ExtensionAuthPage(props: {
  searchParams: Promise<{ redirect_uri?: string }>;
}) {
  const { redirect_uri } = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!redirect_uri) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="p-8 bg-card rounded-2xl shadow-xl border text-center">
          <h1 className="text-xl font-bold text-destructive mb-2">Invalid Request</h1>
          <p className="text-muted-foreground text-sm">Missing redirect_uri parameter.</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to sign-in page with a callback back here
  if (!session) {
    const callbackUrl = `/auth/extension?redirect_uri=${encodeURIComponent(redirect_uri)}`;
    return redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // User is logged in, extract session token and redirect back to extension
  const token = session.session.token;
  const finalUrl = new URL(redirect_uri);
  finalUrl.searchParams.set("token", token);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-6">
      <div className="p-8 bg-card rounded-3xl shadow-2xl border border-primary/10 text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Authenticating Extension</h1>
        <p className="text-muted-foreground text-sm">
          Success! We're sending you back to the extension. This window will close automatically.
        </p>
        <a 
          href={finalUrl.toString()} 
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          Click here if not redirected
        </a>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `window.location.href = "${finalUrl.toString()}";`
      }} />
    </div>
  );
}
