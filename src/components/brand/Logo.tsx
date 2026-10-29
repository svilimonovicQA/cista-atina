import { useId } from "react";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/** Znak: pin na mapi sa iskricom, u zeleno-tirkiznom gradijentu. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M16 6.5c-4 0-7.2 3.1-7.2 7 0 5 7.2 11.6 7.2 11.6s7.2-6.6 7.2-11.6c0-3.9-3.2-7-7.2-7z" fill="white" />
      <path d="M16 9.6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#10b981" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className={compact ? "size-8" : "size-10"} />
      <div className="leading-tight">
        <div className={`font-semibold tracking-tight text-slate-900 ${compact ? "text-base" : "text-lg"}`}>{APP_NAME}</div>
        {!compact && <div className="text-xs text-slate-500">{APP_TAGLINE}</div>}
      </div>
    </div>
  );
}
