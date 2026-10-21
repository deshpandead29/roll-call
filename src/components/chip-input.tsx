"use client";

import { useId, useState } from "react";

// Type a name, Enter adds it, Backspace on empty removes the last one,
// pasted comma lists split. Same behaviour as the prototype's chip field.
export function ChipInput({
  label,
  placeholder,
  value,
  onChange,
  max = 24,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const next = value.slice();
    for (const v of raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)) {
      if (!next.some((x) => x.toLowerCase() === v.toLowerCase()) && next.length < max) next.push(v.slice(0, 40));
    }
    setDraft("");
    if (next.length !== value.length) onChange(next);
  }

  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="chipin">
        {value.length > 0 && (
          <div className="chipin-list">
            {value.map((v, i) => (
              <span key={v} className="chipv">
                {v}
                <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="chipin-row">
          <input
            id={id}
            placeholder={placeholder}
            autoComplete="off"
            maxLength={40}
            enterKeyHint="done"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[,\n]/.test(text)) {
                e.preventDefault();
                add(text);
              }
            }}
            onBlur={() => draft.trim() && add(draft)}
          />
          <button type="button" className="ghost sm" onClick={() => add(draft)}>Add</button>
        </div>
      </div>
      <span className="muted small">Press Enter after each name.</span>
    </div>
  );
}

// Folds a half-typed name into the list on submit, so it isn't lost.
export function withDraft(value: string[], form: HTMLFormElement): string[] {
  const pending = form.querySelector<HTMLInputElement>(".chipin-row input")?.value ?? "";
  const next = value.slice();
  for (const v of pending.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
  }
  return next;
}
