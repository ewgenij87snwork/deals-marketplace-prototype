'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';

export function UrlFilterForm({ children }: { children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const signature = useSearchParams().toString();

  useEffect(() => {
    const timer = window.setTimeout(() => form.current?.reset(), 0);
    return () => window.clearTimeout(timer);
  }, [children, signature]);

  return (
    <form className="search-bar" ref={form}>
      {children}
    </form>
  );
}
