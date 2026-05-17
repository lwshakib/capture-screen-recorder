import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Check } from "lucide-react"

/**
 * CustomSelect Component
 * A stylized replacement for the native <select> element using Tailwind.
 */

export type SelectOption = { label: string; value: string }

type Props = {
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel = useMemo(() => {
    return options.find((o) => o.value === value)?.label || placeholder
  }, [options, value, placeholder])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  return (
    <div
      className={`relative w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="group flex h-9 w-full items-center justify-between rounded-xl border border-border/50 bg-accent/30 px-3 text-[10px] font-bold transition-all outline-none hover:bg-accent/50 focus:border-primary/50"
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="absolute top-full right-0 left-0 z-[5100] mt-1 max-h-40 animate-in overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-2xl duration-200 fade-in slide-in-from-top-1">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-[10px] font-medium transition-colors ${
                opt.value === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check className="h-3 w-3" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CustomSelect
