"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile zaštita od botova. Bez site ključa ne prikazuje ništa (lokalni razvoj). */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string) => void; resetKey: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [loaded, setLoaded] = useState(() => typeof window !== "undefined" && Boolean(window.turnstile));

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY || !loaded || !containerRef.current || !window.turnstile) return;
    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      language: "sr",
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "error-callback": () => onTokenRef.current(""),
    });
    widgetRef.current = id;
    return () => {
      window.turnstile?.remove(id);
      widgetRef.current = null;
    };
  }, [loaded]);

  // Token važi za jedno slanje, pa posle neuspešnog pokušaja tražimo novi.
  useEffect(() => {
    if (resetKey > 0 && widgetRef.current) {
      window.turnstile?.reset(widgetRef.current);
      onTokenRef.current("");
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setLoaded(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
}

export const TURNSTILE_ENABLED = Boolean(SITE_KEY);
