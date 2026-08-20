import { switchPersonaAction } from './actions/demo';

const roles = [
  ['BUYER', 'Buyer', 'Maintain an acquisition mandate, explore Assets, and contact Sellers.'],
  ['SELLER', 'Seller', 'Publish an Asset, discover relevant Buyers, and send an inquiry.'],
  [
    'PLATFORM_MANAGER',
    'Platform Manager',
    'Review marketplace participants and moderate non-compliant accounts.',
  ],
] as const;

export default function WelcomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="mb-10 max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-blue-700">
          N5Deal · fictional reviewer demo
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          A focused marketplace for M&amp;A opportunities.
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Choose a role. Your browser receives an isolated demo workspace, so mutations persist
          after refresh without affecting another reviewer.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map(([value, title, description]) => (
          <form
            action={switchPersonaAction}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            key={value}
          >
            <input name="role" type="hidden" value={value} />
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{description}</p>
            <button className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-4 font-medium text-white hover:bg-blue-700">
              Continue as {title}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
