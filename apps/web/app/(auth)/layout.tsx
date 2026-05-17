import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (session) {
    const searchParams = new URL(
      (await headers()).get("referer") || "",
      "http://localhost"
    ).searchParams
    const callbackURL = searchParams.get("callbackURL") || "/home"
    return redirect(callbackURL)
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  )
}
