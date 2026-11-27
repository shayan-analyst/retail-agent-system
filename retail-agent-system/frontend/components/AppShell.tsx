'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Topbar from '@/components/Topbar';
import TableLabels from '@/components/TableLabels';
import { Loader2 } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) router.push('/login');
  }, [token, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex min-h-[100dvh]">
      <Navbar />
      <TableLabels />
      {/* pt-14 clears the mobile top bar; overflow-x-clip keeps the desktop
          top bar sticky (a scrolling container would break `position: sticky`). */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-clip pt-14 md:pt-0">
        <Topbar />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
