"use client"

import { useEffect } from "react"

export default function AutoRedirect({ url }: { url: string }) {
  useEffect(() => {
    // Attempt to redirect automatically after a small delay
    const timer = setTimeout(() => {
      window.location.href = url
    }, 1000)

    return () => clearTimeout(timer)
  }, [url])

  return null
}
