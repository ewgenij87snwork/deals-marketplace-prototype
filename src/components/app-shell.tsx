import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Principal } from '@/server/policy/authorization';

export function AppShell({
  principal,
  title,
  eyebrow,
  children,
}: {
  principal: Principal;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
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
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          N5<span>Deal</span>
        </Link>
        <p className="role-label">{principal.role.replaceAll('_', ' ')}</p>
        <nav>
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="switch-link">
          Switch persona
        </Link>
      </aside>
      <main className="content">
        <div className="content-inner">
          <p className="eyebrow">{eyebrow ?? 'N5Deal marketplace'}</p>
          <h1>{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
