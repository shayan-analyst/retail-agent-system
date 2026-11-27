'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import {
  LayoutDashboard, Package, Receipt, Bot, Store, Users, MessageCircleWarning,
  ClipboardList, Truck, TrendingUp, Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

type Item = { href: string; label: string; icon: typeof Store };

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Store',
    items: [
      { href: '/sales', label: 'Sales', icon: TrendingUp },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/accounting', label: 'Accounting', icon: Receipt },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/complaints', label: 'Complaints', icon: MessageCircleWarning },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    title: 'Assistant',
    items: [{ href: '/agent', label: 'AI Agent', icon: Bot }],
  },
];

const STORAGE_KEY = 'sidebar-collapsed';

function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow">
        <Store className="h-5 w-5" />
      </div>
      {!compact && (
        <span className="whitespace-nowrap text-[17px] font-bold leading-tight tracking-tight text-ash-900">
          Retail Agent
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            Store operations
          </span>
        </span>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);        // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === '1'); } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(STORAGE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
      return !c;
    });
  };

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // `compact` only applies on desktop; the mobile drawer is always full width.
  const label = (text: string) => (
    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'md:w-0 md:opacity-0' : 'md:w-auto md:opacity-100'}`}>
      {text}
    </span>
  );

  const renderLink = ({ href, label: text, icon: Icon }: Item) => {
    const active = pathname === href;
    return (
      <li key={href} className="relative">
        <Link
          href={href}
          title={collapsed ? text : undefined}
          aria-current={active ? 'page' : undefined}
          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
            active
              ? 'bg-gradient-to-r from-brand-600 to-brand-500 font-semibold text-white shadow-glow'
              : 'font-medium text-ash-600 hover:bg-brand-50 hover:text-ash-900'
          } ${collapsed ? 'md:justify-center md:gap-0 md:px-0' : ''}`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {label(text)}
        </Link>
        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-ash-900 px-2.5 py-1.5 text-xs font-medium text-ash-50 opacity-0 shadow-lg transition-opacity md:block md:group-hover:opacity-100">
            {text}
          </span>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="glass fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ash-200 px-3 md:hidden">
        <BrandMark />
        <div className="flex items-center gap-1">
          <ThemeToggle variant="icon" className="!h-10 !w-10" />
          <UserMenu compact />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-lg text-ash-700 hover:bg-brand-50"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ash-950/40 md:hidden"
        />
      )}

      <nav
        aria-label="Primary"
        className={`glass fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-ash-200/70 px-3 py-5 transition-[transform,width] duration-300 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          collapsed ? 'md:w-[76px]' : 'md:w-64'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Collapse / expand handle, sits on the sidebar's outer edge */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-7 z-[60] hidden h-6 w-6 place-items-center rounded-full border border-ash-200 bg-surface text-ash-600 shadow-glass transition hover:scale-110 hover:border-brand-400 hover:bg-brand-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:grid"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className={`mb-5 hidden items-center md:flex ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {collapsed ? <BrandMark compact /> : <BrandMark />}
        </div>
        <div className="h-10 md:hidden" aria-hidden="true" />

        <div className="no-scrollbar -mx-1 flex-1 overflow-y-auto overflow-x-hidden px-1">
          {groups.map((g, i) => (
            <div key={g.title} className={i > 0 ? 'mt-4' : ''}>
              <p
                className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ash-500 transition-opacity ${
                  collapsed ? 'md:hidden' : ''
                }`}
              >
                {g.title}
              </p>
              {collapsed && i > 0 && <div className="mx-3 mb-2 hidden border-t border-ash-200 md:block" />}
              <ul className="space-y-0.5">{g.items.map(renderLink)}</ul>
            </div>
          ))}
        </div>

      </nav>
    </>
  );
}
