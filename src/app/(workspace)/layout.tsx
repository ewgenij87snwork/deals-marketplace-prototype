import { AppShell } from '@/components/app-shell';
import { requirePageAccess } from '@/server/policy/page-access';

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const principal = await requirePageAccess();
  return <AppShell principal={principal}>{children}</AppShell>;
}
