'use client';

import { useState } from 'react';
import { switchPersonaAction } from '@/app/actions/demo';

const roles = [
  ['BUYER', 'Buyer', 'Maintain an acquisition mandate, explore Assets, and contact Sellers.'],
  ['SELLER', 'Seller', 'Publish an Asset, discover relevant Buyers, and send an inquiry.'],
  [
    'PLATFORM_MANAGER',
    'Platform Manager',
    'Review marketplace participants and moderate non-compliant accounts.',
  ],
] as const;

export function PersonaChooser() {
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(formData: FormData) {
    const role = String(formData.get('role') ?? '');
    setPendingRole(role);
    setError(null);
    try {
      const result = await switchPersonaAction(formData);
      if (!result.ok) setError(result.message);
    } catch {
      setError('The server could not be reached. Check your connection and retry.');
    } finally {
      setPendingRole(null);
    }
  }

  return (
    <>
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map(([value, title, description]) => (
          <form
            action={choose}
            aria-busy={pendingRole === value}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            key={value}
          >
            <input name="role" type="hidden" value={value} />
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{description}</p>
            <button
              className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white hover:bg-blue-700"
              disabled={pendingRole !== null && pendingRole !== value}
              onClick={(event) => {
                if (pendingRole !== null) {
                  event.preventDefault();
                  return;
                }
                setPendingRole(value);
                setError(null);
              }}
            >
              {pendingRole === value && <span aria-hidden="true" className="button-spinner" />}
              {pendingRole === value ? 'Preparing workspace…' : `Continue as ${title}`}
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
