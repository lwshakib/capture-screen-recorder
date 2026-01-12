import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { label: string; value: string };

type Props = {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value]
  );

  const selectedLabel =
    selectedIndex >= 0 ? options[selectedIndex].label : placeholder;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      // Focus the selected or first item
      const idx = selectedIndex >= 0 ? selectedIndex : 0;
      const item = listRef.current.querySelectorAll<HTMLLIElement>("li")[idx];
      item?.focus();
    }
  }, [open, selectedIndex]);

  const toggle = () => {
    if (disabled) return;
    setOpen((p) => !p);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onItemKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLLIElement>("li");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = options[idx];
      if (item) {
        onChange(item.value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div
      className={`cs-container${disabled ? " cs-disabled" : ""}`}
      ref={containerRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className="cs-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span className="cs-label">{selectedLabel}</span>
        <svg
          className={`cs-caret${open ? " cs-open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <ul className="cs-list" role="listbox" ref={listRef}>
          {options.map((opt, idx) => (
            <li
              key={opt.value}
              role="option"
              tabIndex={0}
              aria-selected={opt.value === value}
              className={`cs-item${opt.value === value ? " cs-selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              onKeyDown={(e) => onItemKeyDown(e, idx)}
            >
              <span className="cs-item-label">{opt.label}</span>
              {opt.value === value && (
                <svg
                  className="cs-item-check"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.7-7.7 1.4 1.4z"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CustomSelect;
