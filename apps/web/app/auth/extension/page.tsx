import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function ExtensionAuthPage(props: {
  searchParams: Promise<{ redirect_uri?: string }>
}) {
  const { redirect_uri } = await props.searchParams
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!redirect_uri) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-xl">
          <h1 className="mb-2 text-xl font-bold text-destructive">
            Invalid Request
          </h1>
          <p className="text-sm text-muted-foreground">
            Missing redirect_uri parameter.
          </p>
        </div>
      </div>
    )
  }

  // If user is not logged in, redirect to sign-in page with a callback back here
  if (!session) {
    const callbackUrl = `/auth/extension?redirect_uri=${encodeURIComponent(redirect_uri)}`
    return redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  // User is logged in, extract session token and redirect back to extension
  const token = session.session.token
  const finalUrl = new URL(redirect_uri)
  finalUrl.searchParams.set("token", token)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6 bg-background">
      <div className="max-w-sm space-y-4 rounded-3xl border border-primary/10 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Authenticating Extension
        </h1>
        <p className="text-sm text-muted-foreground">
          Success! We're sending you back to the extension. This window will
          close automatically.
        </p>
        <a
          href={finalUrl.toString()}
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
        >
          Click here if not redirected
        </a>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.href = "${finalUrl.toString()}";`,
        }}
      />
    </div>
  )
}
