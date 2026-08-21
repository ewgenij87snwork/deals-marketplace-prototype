import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Principal } from '@/server/policy/authorization';
import { CreatorSignature } from '@/components/creator-signature';
import { ResetDemoButton } from '@/components/reset-demo-button';

export function AppShell({ principal, children }: { principal: Principal; children: ReactNode }) {
  const links =
    principal.role === 'BUYER'
      ? [
          ['/buyer/profile', 'Mandate'],
          ['/buyer/assets', 'Marketplace'],
          ['/contacts', 'Inquiries'],
        ]
      : principal.role === 'SELLER'
        ? [
            ['/seller/publish', 'Publish Asset'],
            ['/seller/assets', 'My Assets'],
            ['/seller/buyers', 'Find Buyers'],
            ['/contacts', 'Inquiries'],
          ]
        : [
            ['/manager/participants', 'Participants'],
            ['/manager/assets', 'Assets'],
          ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link aria-label="Deals" href="/dashboard" className="brand">
          Deal<span>s</span>
        </Link>
        <p className="role-label">{principal.role.replaceAll('_', ' ')}</p>
        <nav>
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <CreatorSignature className="creator-signature--sidebar" />
          <Link href="/" className="switch-link">
            Switch persona
          </Link>
          <ResetDemoButton />
        </div>
      </aside>
      <main className="content" id="main-content">
        <div className="content-inner">{children}</div>
        <CreatorSignature className="creator-signature--mobile" />
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow = 'Deals marketplace',
}: {
  title: string;
  eyebrow?: string;
}) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </>
  );
}
