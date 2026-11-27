'use client';

import { useEffect, useState } from 'react';
import { getKpis } from '@/lib/api';
import KpiCard from '@/components/KpiCard';
import AlertBanner from '@/components/AlertBanner';
import { Package, AlertTriangle, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

interface KpiData {
  total_products: number;
  low_stock_alerts: number;
  monthly_revenue_pkr: number;
  weekly_revenue_pkr: number;
  top_categories: { category: string; revenue: number }[];
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getKpis()
      .then((r) => setKpis(r.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ash-800">Dashboard</h1>
        <p className="text-sm text-ash-600 mt-1">
          Real-time overview of your retail store
        </p>
      </div>

      <AlertBanner />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
      ) : kpis ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <KpiCard
              title="Total Products"
              value={kpis.total_products}
              subtitle="Active SKUs"
              icon={<Package className="w-5 h-5" />}
              color="brand"
            />
            <KpiCard
              title="Low Stock Alerts"
              value={kpis.low_stock_alerts}
              subtitle="Need reorder"
              icon={<AlertTriangle className="w-5 h-5" />}
              color={kpis.low_stock_alerts > 0 ? 'amber' : 'emerald'}
            />
            <KpiCard
              title="Monthly Revenue"
              value={`Rs. ${(kpis.monthly_revenue_pkr || 0).toLocaleString()}`}
              subtitle="Last 30 days"
              icon={<DollarSign className="w-5 h-5" />}
              color="emerald"
            />
            <KpiCard
              title="Weekly Revenue"
              value={`Rs. ${(kpis.weekly_revenue_pkr || 0).toLocaleString()}`}
              subtitle="Last 7 days"
              icon={<TrendingUp className="w-5 h-5" />}
              color="brand"
            />
          </div>

          {kpis.top_categories && kpis.top_categories.length > 0 && (
            <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-brand-700" />
                <h2 className="text-base font-semibold text-ash-800">
                  Top Categories by Revenue
                </h2>
              </div>
              <div className="space-y-3">
                {kpis.top_categories.map((cat, i) => {
                  const max = kpis.top_categories[0]?.revenue || 1;
                  const pct = Math.round((cat.revenue / max) * 100);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-ash-700 font-medium">{cat.category}</span>
                        <span className="text-ash-600">
                          Rs. {cat.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ash-100">
                        <div
                          className="bar-grow h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
