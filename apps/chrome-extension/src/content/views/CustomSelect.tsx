import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * CustomSelect Component
 * A stylized replacement for the native <select> element using Tailwind.
 */

export type SelectOption = { label: string; value: string };

type Props = {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function CustomSelect({ options, value, onChange, placeholder = "Select...", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedLabel = useMemo(() => {
    return options.find(o => o.value === value)?.label || placeholder;
  }, [options, value, placeholder]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
      <button 
        type="button" 
        className="w-full h-9 px-3 flex items-center justify-between bg-accent/30 border border-border/50 rounded-xl text-[10px] font-bold hover:bg-accent/50 focus:border-primary/50 transition-all outline-none group" 
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul className="absolute top-full left-0 right-0 mt-1 py-1 bg-card border border-border rounded-xl shadow-2xl z-[5100] animate-in fade-in slide-in-from-top-1 duration-200 max-h-40 overflow-y-auto">
          {options.map(opt => (
            <li 
              key={opt.value} 
              className={`px-3 py-2 flex items-center justify-between text-[10px] font-medium cursor-pointer transition-colors ${
                opt.value === value 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check className="h-3 w-3" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CustomSelect;
