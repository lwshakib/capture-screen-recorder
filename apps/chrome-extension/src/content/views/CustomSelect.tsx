import { useEffect, useMemo, useRef, useState } from "react";

/**
 * CustomSelect Component
 * A stylized replacement for the native <select> element.
 * Specifically designed to work within the Shadow DOM isolated context.
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

  // Find the currently selected label for display
  const selectedLabel = useMemo(() => {
    return options.find(o => o.value === value)?.label || placeholder;
  }, [options, value, placeholder]);

  /**
   * Closes the dropdown when a click is detected outside the component.
   */
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
    <div className={`custom-select ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      {/* The main trigger button */}
      <button 
        type="button" 
        className="select-trigger" 
        onClick={() => !disabled && setOpen(!open)}
      >
        <span>{selectedLabel}</span>
        <span className="arrow">▼</span>
      </button>

      {/* The Dropdown list */}
      {open && (
        <ul className="select-options">
          {options.map(opt => (
            <li 
              key={opt.value} 
              className={opt.value === value ? 'selected' : ''}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CustomSelect;
