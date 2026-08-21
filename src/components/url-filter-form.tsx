'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';

export function UrlFilterForm({ children }: { children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const editVersion = useRef(0);
  const signature = useSearchParams().toString();

  useEffect(() => {
    const version = editVersion.current;
    const timer = window.setTimeout(() => {
      if (editVersion.current === version) form.current?.reset();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [signature]);

  return (
    <form
      className="search-bar"
      onChangeCapture={() => {
        editVersion.current += 1;
      }}
      ref={form}
    >
      {children}
    </form>
  );
}
