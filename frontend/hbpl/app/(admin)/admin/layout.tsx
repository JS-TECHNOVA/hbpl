import type { ReactNode } from 'react';
import { AdminAppShell } from './_components/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAppShell>{children}</AdminAppShell>;
}