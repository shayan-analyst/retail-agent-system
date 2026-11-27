'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/** Avatar button in the top bar that opens a small account menu with sign-out. */
export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const initial = user.username?.[0] ?? '?';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold uppercase text-white shadow-sm">
          {initial}
        </span>
        {!compact && (
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold text-ash-900">{user.username}</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-ash-500">{user.role}</span>
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-ash-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-ash-200 bg-surface p-1.5 shadow-glass"
        >
          <div className="px-3 pb-2.5 pt-2">
            <div className="truncate text-sm font-semibold text-ash-900">{user.username}</div>
            {user.email && (
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ash-500">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800">
              <ShieldCheck className="h-3 w-3" />
              {user.role}
            </span>
          </div>
          <div className="my-1 border-t border-ash-200" />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ash-700 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
