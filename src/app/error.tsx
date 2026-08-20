'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-slate-600">The demo data was not changed. Retry the last view.</p>
      <button className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-white" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
