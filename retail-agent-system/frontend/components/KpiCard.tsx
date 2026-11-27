'use client';

import { ReactNode, useEffect, useState } from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color: 'brand' | 'emerald' | 'amber' | 'red';
}

// Glass card + a soft coloured wash. Colours resolve through CSS variables /
// dark-mode overrides, so each card reads correctly in both themes.
const surfaceMap = {
  brand: 'border-brand-200/80 from-brand-100/70',
  emerald: 'border-emerald-200 from-emerald-100/80 dark:from-emerald-500/15',
  amber: 'border-amber-200 from-amber-100/80 dark:from-amber-500/15',
  red: 'border-red-200 from-red-100/80 dark:from-red-500/15',
};

const iconMap = {
  brand: 'bg-brand-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
};

// The value carries the hue; labels stay neutral so they never drop below AA.
const valueMap = {
  brand: 'text-brand-900',
  emerald: 'text-emerald-900',
  amber: 'text-amber-900',
  red: 'text-red-900',
};

/** Animates a number (or "Rs. 1,234" style string) from 0 up to its value. */
function useCountUp(value: string | number, ms = 900): string {
  const raw = String(value);
  const m = raw.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, '')) : NaN;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      setN(target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  if (!m || Number.isNaN(target)) return raw;
  const shown = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${m[1]}${shown}${m[3]}`;
}

export default function KpiCard({ title, value, subtitle, icon, color }: Props) {
  const display = useCountUp(value);
  return (
    <div
      className={`glass group relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-3.5 sm:p-5 shadow-glass transition-all duration-300 hover:-translate-y-0.5 animate-fade-up ${surfaceMap[color]}`}
    >
      <div className="mb-3 flex items-start justify-between sm:mb-4">
        <div className={`rounded-xl p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${iconMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className={`mb-0.5 text-lg font-bold sm:text-2xl tracking-tight ${valueMap[color]}`}>{display}</div>
      <div className="text-xs font-medium text-ash-600 sm:text-sm">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-ash-500">{subtitle}</div>}
    </div>
  );
}
