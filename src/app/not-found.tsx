import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-semibold">Not found</h1>
      <p className="mt-3 text-slate-600">This fictional marketplace item may have been removed.</p>
      <Link
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-white"
        href="/dashboard"
      >
        Return to dashboard
      </Link>
    </main>
  );
}
