'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchSignature = searchParams.toString();
  const currentUrl = `${pathname}${searchSignature ? `?${searchSignature}` : ''}`;
  const [pendingFromUrl, setPendingFromUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const target = event.target as Element | null;
      const link = target?.closest('a');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.href === window.location.href) return;
      setPendingFromUrl(currentUrl);
    }

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [currentUrl]);

  if (pendingFromUrl !== currentUrl) return null;

  return (
    <div aria-live="polite" className="navigation-feedback" role="status">
      <span className="navigation-feedback-bar" />
      <span className="sr-only">Loading the next view…</span>
    </div>
  );
}
