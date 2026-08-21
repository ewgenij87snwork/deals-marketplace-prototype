import { PersonaChooser } from '@/components/persona-chooser';
import { CreatorSignature } from '@/components/creator-signature';

const notices: Record<string, string> = {
  session: 'Your demo session expired or is no longer available.',
  suspended: 'This demo participant is suspended.',
  removed: 'This demo participant was removed.',
  reset: 'The previous demo workspace was reset.',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const value = (await searchParams).notice;
  const notice = typeof value === 'string' ? notices[value] : undefined;
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="mb-10 max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-blue-700">
          Deals · fictional reviewer demo
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          A focused marketplace for M&amp;A opportunities.
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Choose a role. Your browser receives an isolated demo workspace, so mutations persist
          after refresh without affecting another reviewer.
        </p>
      </div>
      {notice && (
        <p className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900" role="status">
          {notice}
        </p>
      )}
      <PersonaChooser />
      <CreatorSignature className="creator-signature--welcome" />
    </main>
  );
}
