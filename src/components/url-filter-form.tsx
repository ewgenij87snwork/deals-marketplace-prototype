'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

type UrlFilterFormProps = {
  children: ReactNode;
  className?: string;
};

const TEXT_FILTER_DEBOUNCE_MS = 300;

export function UrlFilterForm({ children, className = 'search-bar' }: UrlFilterFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const editVersion = useRef(0);
  const internalNavigationSerial = useRef(0);
  const internalNavigationSignatures = useRef(new Map<string, number>());
  const navigationTimer = useRef<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const signature = useSearchParams().toString();

  function clearNavigationTimer() {
    if (navigationTimer.current === null) return;
    window.clearTimeout(navigationTimer.current);
    navigationTimer.current = null;
  }

  function navigate(nextForm: HTMLFormElement) {
    clearNavigationTimer();
    if (!nextForm.checkValidity()) {
      setIsUpdating(false);
      return;
    }

    const query = new URLSearchParams();
    for (const [name, rawValue] of new FormData(nextForm)) {
      if (typeof rawValue !== 'string') continue;
      const value = rawValue.trim();
      if (!value) continue;
      query.append(name, name === 'country' ? value.toUpperCase() : value);
    }
    const nextSignature = query.toString();
    if (nextSignature === signature) {
      setIsUpdating(false);
      return;
    }
    const serial = (internalNavigationSerial.current += 1);
    internalNavigationSignatures.current.set(nextSignature, serial);
    setIsUpdating(true);
    router.push(nextSignature ? `${pathname}?${nextSignature}` : pathname, { scroll: false });
  }

  function scheduleNavigation() {
    if (!form.current) return;
    clearNavigationTimer();
    setIsUpdating(true);
    navigationTimer.current = window.setTimeout(
      () => form.current && navigate(form.current),
      TEXT_FILTER_DEBOUNCE_MS,
    );
  }

  useEffect(() => {
    const observedSerial = internalNavigationSignatures.current.get(signature);
    if (observedSerial !== undefined) {
      for (const [pendingSignature, serial] of internalNavigationSignatures.current) {
        if (serial <= observedSerial) internalNavigationSignatures.current.delete(pendingSignature);
      }
      setIsUpdating(false);
      return;
    }
    internalNavigationSignatures.current.clear();
    setIsUpdating(false);
    const version = editVersion.current;
    const timer = window.setTimeout(() => {
      if (editVersion.current === version) form.current?.reset();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [signature]);

  useEffect(
    () => () => {
      if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
    },
    [],
  );

  return (
    <form
      aria-busy={isUpdating}
      className={`${className}${isUpdating ? ' is-updating' : ''}`}
      onChangeCapture={() => {
        editVersion.current += 1;
        scheduleNavigation();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
      ref={form}
    >
      <output
        aria-hidden={!isUpdating}
        aria-live={isUpdating ? 'polite' : 'off'}
        className={`filter-feedback${isUpdating ? ' is-visible' : ''}`}
      >
        <span className="filter-feedback-dot" aria-hidden="true" />
        Updating matches…
      </output>
      {children}
    </form>
  );
}
