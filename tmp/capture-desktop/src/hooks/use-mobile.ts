import * as React from "react"

// Width in pixels that defines a mobile device view
const MOBILE_BREAKPOINT = 768

/**
 * useIsMobile Hook
 * Detects if the current window size matches mobile dimensions.
 * Useful for conditionally rendering mobile-specific interactive elements.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Setup media query listener for responsive design
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Callback to update state when window resizes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Attach listener
    mql.addEventListener("change", onChange)
    
    // Initial check on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup: remove listener to prevent memory leaks
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
