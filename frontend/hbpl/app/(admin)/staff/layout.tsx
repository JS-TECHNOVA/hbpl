import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminAppShell } from './_components/admin-shell';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAppShell>{children}</AdminAppShell>;
}