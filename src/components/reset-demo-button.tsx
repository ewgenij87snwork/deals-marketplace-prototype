'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetDemoAction } from '@/server/actions/marketplace';

export function ResetDemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setPending(true);
    setError(null);
    try {
      const result = await resetDemoAction();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace('/?notice=reset');
      router.refresh();
    } catch {
      setError('The server could not be reached. Check your connection and retry.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="session-controls">
      <button className="reset-link" disabled={pending} onClick={reset} type="button">
        {pending ? 'Resetting…' : 'Reset demo workspace'}
      </button>
      {error && (
        <span className="session-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
