import React from "react";

export function Toggle({
  value,
  onChange,
  options,
  activeClassName = "bg-emerald-500 text-black",
  inactiveClassName = "bg-neutral-800/60 text-white",
}) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-white/10">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm transition-colors duration-200
            ${value === opt.value ? activeClassName : inactiveClassName}
            ${i !== options.length - 1 ? "border-r border-white/10" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
