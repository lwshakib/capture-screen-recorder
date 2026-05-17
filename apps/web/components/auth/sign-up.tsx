"use client"
import { authClient } from "@/lib/auth-client"
import { LogoIcon } from "@/components/layout/logo"
import { Button } from "@workspace/ui/components/button"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackURL = searchParams.get("callbackURL") || "/home"

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackURL,
      })
    } catch (error) {
      console.error("Sign-up failed", error)
      setLoading(false)
    }
  }

  return (
    <section className="grid min-h-screen w-full grid-cols-1 overflow-hidden bg-background text-foreground lg:grid-cols-10">
      {/* Visual Asset Container (70% width on Desktop) */}
      <div className="relative hidden h-full w-full bg-zinc-950 lg:col-span-7 lg:block">
        <Image
          src="/auth-preview-signup.png"
          fill
          className="object-cover opacity-90 transition-opacity duration-500"
          alt="Capture Screen Recorder Visual"
          priority
        />
        {/* Sleek bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
      </div>

      {/* Google-only Authentication Sidebar (30% width on Desktop) */}
      <div className="relative z-10 col-span-1 flex h-full flex-col justify-between border-l border-border bg-card p-8 md:p-10 lg:col-span-3 lg:p-8">
        {/* Header containing Brand Logo & Description */}
        <div className="my-auto space-y-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Link href="/" aria-label="go home" className="block w-fit">
              <LogoIcon className="h-10 w-10 text-primary" />
            </Link>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Join Capture
              </h1>
              <p className="text-xs font-medium tracking-widest text-muted-foreground">
                Screen Recorder
              </p>
            </div>
          </div>

          <p className="text-center text-sm leading-relaxed text-muted-foreground lg:text-left">
            Join the open-source community of high-fidelity screen recording.
            Experience lightning-fast cloud transfers, customizable framerates,
            native desktop client integration, and robust developer APIs.
          </p>

          {/* Social Sign-In Button */}
          <div className="space-y-4 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleSignUp}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-border bg-background py-6 text-sm font-semibold shadow-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 256 262"
                >
                  <path
                    fill="#4285f4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  ></path>
                  <path
                    fill="#34a853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  ></path>
                  <path
                    fill="#fbbc05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                  ></path>
                  <path
                    fill="#eb4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  ></path>
                </svg>
              )}
              <span>Continue with Google</span>
            </Button>
          </div>
        </div>

        {/* Footer Redirect */}
        <div className="border-t border-border/60 pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={
                callbackURL
                  ? `/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`
                  : "/sign-in"
              }
              className="font-semibold text-primary hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
