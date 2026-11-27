'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  getSalesToday, getDailyRevenue, getRecentTransactions,
  getCategoryRevenue, getKpis, getTopProducts, getProfitSummary,
} from '@/lib/api';
import {
  TrendingUp, DollarSign, ShoppingBag, RefreshCw,
  Receipt, TrendingDown, Package,
} from 'lucide-react';

interface SalesToday   { count: number; revenue: number }
interface DailyPoint   { date: string; label: string; revenue: number; count: number }
interface Transaction  { invoice_number: string; customer_id: number | null; net_amount: number; tax: number; payment_method: string; created_at: string }
interface CategoryRev  { category: string; revenue: number; profit: number }
interface Kpis         { monthly_revenue_pkr: number; weekly_revenue_pkr: number }
interface TopProduct   { name: string; category: string; units_sold: number; revenue: number }
interface ProfitSummary { today_profit: number; avg_order_value: number; payment_breakdown: { method: string; count: number; revenue: number }[] }

// Green-led chart palette: readable on both the light and the deep-green dark theme.
const COLORS = ['#2fa36b','#f2b01e','#2bb3c0','#8bc34a','#7c83e8','#ef6b5b','#f58a3a','#16a085'];
const PIE_COLORS = ['#2fa36b','#f2b01e','#2bb3c0','#8bc34a','#7c83e8'];
const BAR_COLOR = '#34b57a';

// Theme-aware chart chrome (values come from CSS variables in globals.css).
const fmtAxis = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${v}`);
const AXIS_TICK = { fontSize: 10, fill: 'var(--chart-axis)' };
const TOOLTIP_STYLE = {
  background: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 10,
  color: 'var(--chart-axis)',
  fontSize: 12,
};

const PAYMENT_METHODS = ['All', 'Cash', 'Card', 'Online'];
const DAY_OPTIONS = [
  { label: 'Last 7 days',  value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
];
const PERIOD_OPTIONS = [
  { label: 'Today', value: 'today' as const },
  { label: 'This Week', value: 'week' as const },
  { label: 'This Month', value: 'month' as const },
];

export default function SalesDashboardPage() {
  const [salesToday,    setSalesToday]    = useState<SalesToday | null>(null);
  const [daily,         setDaily]         = useState<DailyPoint[]>([]);
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [categories,    setCategories]    = useState<CategoryRev[]>([]);
  const [kpis,          setKpis]          = useState<Kpis | null>(null);
  const [topProducts,   setTopProducts]   = useState<TopProduct[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState('');

  // Filter / period state
  const [dayRange,      setDayRange]      = useState(7);
  const [topPeriod,     setTopPeriod]     = useState<'today' | 'week' | 'month'>('week');
  const [payFilter,     setPayFilter]     = useState('All');

  const loadBase = useCallback(() =>
    Promise.all([
      getSalesToday(),
      getRecentTransactions(payFilter === 'All' ? undefined : payFilter),
      getCategoryRevenue(),
      getKpis(),
      getProfitSummary(),
    ]).then(([st, rt, cr, kp, ps]) => {
      setSalesToday(st.data);
      setTransactions(rt.data);
      setCategories(cr.data);
      setKpis(kp.data);
      setProfitSummary(ps.data);
    }),
  [payFilter]);

  const loadDaily = useCallback(() =>
    getDailyRevenue(dayRange).then(r => setDaily(r.data)),
  [dayRange]);

  const loadTopProducts = useCallback(() =>
    getTopProducts(topPeriod).then(r => setTopProducts(r.data)),
  [topPeriod]);

  const loadAll = useCallback((isInitial = false) => {
    if (isInitial) setLoading(true);
    else setSyncing(true);
    Promise.all([loadBase(), loadDaily(), loadTopProducts()])
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setSyncing(false);
        setLastUpdated(new Date().toLocaleTimeString());
      });
  }, [loadBase, loadDaily, loadTopProducts]);

  // Full reload on mount + silent background refresh every 30s
  useEffect(() => {
    loadAll(true);
    const interval = setInterval(() => loadAll(false), 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  // Reload only transactions when payment filter changes
  useEffect(() => {
    getRecentTransactions(payFilter === 'All' ? undefined : payFilter)
      .then(r => setTransactions(r.data))
      .catch(() => {});
  }, [payFilter]);

  // Reload only daily chart when day range changes
  useEffect(() => {
    loadDaily().catch(() => {});
  }, [loadDaily]);

  // Reload only top products when period changes
  useEffect(() => {
    loadTopProducts().catch(() => {});
  }, [loadTopProducts]);

  const kpiCards = [
    {
      label: 'Sales Today',
      value: salesToday?.count ?? 0,
      sub: `Rs. ${(salesToday?.revenue ?? 0).toLocaleString()} revenue`,
      icon: ShoppingBag,
      bg: 'border-brand-200/80 from-brand-100/70',
      text: 'text-brand-700',
      val: 'text-brand-800',
    },
    {
      label: 'Today Revenue',
      value: `Rs. ${(salesToday?.revenue ?? 0).toLocaleString()}`,
      sub: 'Paid invoices only',
      icon: DollarSign,
      bg: 'border-emerald-200/80 from-emerald-100/70 dark:from-emerald-500/15',
      text: 'text-emerald-700',
      val: 'text-emerald-800',
    },
    {
      label: 'Today Profit',
      value: `Rs. ${(profitSummary?.today_profit ?? 0).toLocaleString()}`,
      sub: 'After cost deduction',
      icon: TrendingDown,
      bg: 'border-emerald-200/80 from-emerald-100/70 dark:from-emerald-500/15',
      text: 'text-emerald-700',
      val: 'text-emerald-800',
    },
    {
      label: 'Avg Order Value',
      value: `Rs. ${(profitSummary?.avg_order_value ?? 0).toLocaleString()}`,
      sub: 'Today\'s invoices',
      icon: Receipt,
      bg: 'border-brand-200/80 from-brand-100/70',
      text: 'text-brand-700',
      val: 'text-brand-800',
    },
    {
      label: 'Weekly Revenue',
      value: `Rs. ${(kpis?.weekly_revenue_pkr ?? 0).toLocaleString()}`,
      sub: 'Last 7 days',
      icon: TrendingUp,
      bg: 'border-brand-200/80 from-brand-100/70',
      text: 'text-brand-700',
      val: 'text-brand-800',
    },
    {
      label: 'Monthly Revenue',
      value: `Rs. ${(kpis?.monthly_revenue_pkr ?? 0).toLocaleString()}`,
      sub: 'This month',
      icon: Receipt,
      bg: 'border-amber-200/80 from-amber-100/70 dark:from-amber-500/15',
      text: 'text-amber-700',
      val: 'text-amber-800',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ash-900">Sales Dashboard</h1>
          <p className="text-sm text-ash-600 mt-1">Live sales overview</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  syncing ? 'bg-brand-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs text-ash-500">
                {syncing ? 'Syncing…' : `Updated ${lastUpdated}`}
              </span>
            </div>
          )}
          <button
            onClick={() => loadAll(false)}
            disabled={syncing}
            className="flex items-center gap-2 text-sm text-ash-600 hover:text-ash-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards — 6 cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
            {kpiCards.map(({ label, value, sub, icon: Icon, bg, text, val }) => (
              <div
                key={label}
                className={`glass group animate-fade-up rounded-2xl border bg-gradient-to-br to-transparent p-5 shadow-glass transition-all duration-300 hover:-translate-y-1 hover:shadow-glow ${bg}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-surface/70 shadow-sm transition-transform duration-300 group-hover:scale-110 ${text}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${text}`}>{label}</span>
                </div>
                <div className={`text-xl font-bold tracking-tight ${val}`}>{value}</div>
                <div className="mt-1 text-xs text-ash-500">{sub}</div>
              </div>
            ))}
          </div>

          {/* Row 2: Daily Revenue + Payment Method Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Revenue with day-range dropdown */}
            <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-ash-800">Daily Revenue</h2>
                <select
                  value={dayRange}
                  onChange={e => setDayRange(Number(e.target.value))}
                  className="rounded-lg border border-ash-200 bg-surface/70 px-2.5 py-1.5 text-xs font-medium text-ash-700 transition focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {DAY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {daily.length === 0 || daily.every((d) => !d.revenue) ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700"><TrendingUp className="h-6 w-6" /></span>
                  <p className="text-sm font-medium text-ash-700">No revenue recorded in this period</p>
                  <p className="text-xs text-ash-500">Sales will appear here as invoices are paid.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#58c08a" />
                        <stop offset="100%" stopColor="#1c8450" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} tickFormatter={fmtAxis} axisLine={false} tickLine={false} width={40} />
                    <Tooltip cursor={{ fill: 'rgb(var(--brand-500) / 0.1)' }} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--chart-axis)' }} formatter={(v) => [`Rs. ${(v as number ?? 0).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="url(#gradRevenue)" radius={[8, 8, 0, 0]} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Method Pie */}
            <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
              <h2 className="text-base font-semibold text-ash-800 mb-4">Payment Methods</h2>
              {!profitSummary?.payment_breakdown?.length ? (
                <div className="flex items-center justify-center h-48 text-ash-500 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={profitSummary.payment_breakdown}
                      dataKey="revenue"
                      nameKey="method"
                      cx="50%"
                      cy="46%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      cornerRadius={6}
                      stroke="none"
                      animationDuration={900}
                    >
                      {profitSummary.payment_breakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--chart-axis)' }} formatter={(v) => `Rs. ${(v as number ?? 0).toLocaleString()}`} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--chart-axis)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 3: Category Revenue + Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Category Revenue horizontal bar */}
            <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
              <h2 className="text-base font-semibold text-ash-800 mb-4">Revenue by Category</h2>
              {categories.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-ash-500 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categories} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} tickFormatter={fmtAxis} axisLine={false} tickLine={false} />
                    <YAxis dataKey="category" type="category" tick={AXIS_TICK} width={70} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--chart-axis)' }} formatter={(v) => [`Rs. ${(v as number ?? 0).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" radius={[0, 8, 8, 0]} animationDuration={900}>
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Selling Products */}
            <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-ash-600" />
                  <h2 className="text-base font-semibold text-ash-800">Top Selling Products</h2>
                </div>
                <select
                  value={topPeriod}
                  onChange={e => setTopPeriod(e.target.value as 'today' | 'week' | 'month')}
                  className="rounded-lg border border-ash-200 bg-surface/70 px-2.5 py-1.5 text-xs font-medium text-ash-700 transition focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {PERIOD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-ash-500 text-sm">No sales in this period</div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[220px]">
                  {topProducts.map((p, i) => {
                    const maxRevenue = topProducts[0]?.revenue || 1;
                    const pct = (p.revenue / maxRevenue) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs text-ash-600 mb-1">
                          <span className="font-medium text-ash-800 truncate max-w-[55%]">{p.name}</span>
                          <span className="text-ash-600">{p.units_sold} units · Rs. {p.revenue.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-ash-100 rounded-full overflow-hidden">
                          <div
                            className="bar-grow h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions with payment method filter */}
          <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-ash-800">Recent Transactions</h2>
              <div className="flex gap-1">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m}
                    onClick={() => setPayFilter(m)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      payFilter === m
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'text-ash-600 border-ash-200 hover:border-brand-300 hover:text-brand-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {transactions.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-ash-500 text-sm">No transactions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ash-100 text-left text-xs uppercase text-ash-600 font-semibold">
                      <th className="pb-3 pr-4">Invoice #</th>
                      <th className="pb-3 pr-4">Customer</th>
                      <th className="pb-3 pr-4 text-right">Amount (Rs.)</th>
                      <th className="pb-3 pr-4 text-right">Tax (Rs.)</th>
                      <th className="pb-3 pr-4">Payment</th>
                      <th className="pb-3">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ash-100">
                    {transactions.map((t, i) => (
                      <tr key={i} className="hover:bg-ash-50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-ash-600">{t.invoice_number}</td>
                        <td className="py-3 pr-4 text-ash-600">
                          {t.customer_id ? `#${t.customer_id}` : 'Walk-in'}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-ash-900">
                          {(t.net_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right text-ash-600">
                          {(t.tax || 0).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs">
                            {t.payment_method || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-ash-500">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB') + ' ' + new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
