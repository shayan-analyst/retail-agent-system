'use client';

import { useEffect, useState } from 'react';
import { getInvoices, getAccountingSummary, getPurchaseOrders, getPurchaseSummary } from '@/lib/api';
import {
  DollarSign, Receipt, TrendingUp, RefreshCw,
  ShoppingCart, PackageCheck, Banknote, Search,
} from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  total_amount: number;
  tax: number;
  status: string;
  created_at: string;
}

interface SalesSummary {
  total_invoices: number;
  total_revenue: number;
  total_tax: number;
  paid_count: number;
  pending_count: number;
  cancelled_count: number;
}

interface PurchaseOrder {
  id: number;
  order_number: string;
  product_id: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier: string;
  status: string;
  created_at: string;
}

interface PurchaseSummary {
  total_purchases: number;
  total_spent: number;
  this_month_purchases: number;
  this_month_spent: number;
}


type Tab = 'sales' | 'purchases';

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('sales');

  // Sales state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Purchases state
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary | null>(null);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [poSearch, setPoSearch] = useState('');

  const loadSales = () => {
    setSalesLoading(true);
    Promise.all([
      getInvoices({}),
      getAccountingSummary(),
    ])
      .then(([iRes, sRes]) => {
        setInvoices(iRes.data);
        setSalesSummary(sRes.data);
      })
      .catch(() => {
        setInvoices([]);
        setSalesSummary(null);
      })
      .finally(() => setSalesLoading(false));
  };

  const loadPurchases = () => {
    setPurchasesLoading(true);
    Promise.all([
      getPurchaseOrders({ status: 'received', limit: 100 }),
      getPurchaseSummary(),
    ])
      .then(([poRes, sumRes]) => {
        setPurchases(poRes.data);
        setPurchaseSummary(sumRes.data);
      })
      .catch(() => {
        setPurchases([]);
        setPurchaseSummary(null);
      })
      .finally(() => setPurchasesLoading(false));
  };

  useEffect(() => { loadSales(); }, []);
  useEffect(() => { if (tab === 'purchases') loadPurchases(); }, [tab]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ash-900">Accounting</h1>
          <p className="text-sm text-ash-600 mt-1">Sales invoices and vendor purchases</p>
        </div>
        <button
          onClick={() => tab === 'sales' ? loadSales() : loadPurchases()}
          className="flex items-center gap-2 text-sm text-ash-600 hover:text-ash-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ash-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('sales')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'sales'
              ? 'bg-surface text-ash-900 shadow-sm'
              : 'text-ash-600 hover:text-ash-700'
          }`}
        >
          Sales / Invoices
        </button>
        <button
          onClick={() => setTab('purchases')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'purchases'
              ? 'bg-surface text-ash-900 shadow-sm'
              : 'text-ash-600 hover:text-ash-700'
          }`}
        >
          Purchases
        </button>
      </div>

      {/* ── SALES TAB ── */}
      {tab === 'sales' && (
        <>
          {salesSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm font-medium text-emerald-700">Total Revenue</span>
                </div>
                <div className="text-2xl font-bold text-emerald-800">
                  Rs. {(salesSummary.total_revenue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  Tax collected: Rs. {(salesSummary.total_tax || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-brand-600" />
                  <span className="text-sm font-medium text-brand-700">Total Invoices</span>
                </div>
                <div className="text-2xl font-bold text-brand-800">{salesSummary.total_invoices}</div>
                <div className="text-xs text-brand-600 mt-1">
                  {salesSummary.paid_count} paid · {salesSummary.pending_count} pending
                </div>
              </div>

              <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-brand-600" />
                  <span className="text-sm font-medium text-brand-700">Paid Invoices</span>
                </div>
                <div className="text-2xl font-bold text-brand-800">{salesSummary.paid_count}</div>
                <div className="text-xs text-brand-600 mt-1">
                  {salesSummary.cancelled_count} cancelled
                </div>
              </div>
            </div>
          )}

          {/* Invoice Search */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500" />
            <input
              type="text"
              placeholder="Search by invoice number..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-ash-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
            {salesLoading ? (
              <div className="flex items-center justify-center h-40 text-ash-500 text-sm">
                Loading invoices...
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-ash-500 text-sm">
                No invoices found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ash-100 text-left text-xs uppercase text-ash-600 font-semibold">
                      <th className="pb-3 pr-4">Invoice #</th>
                      <th className="pb-3 pr-4">Customer ID</th>
                      <th className="pb-3 pr-4 text-right">Amount (Rs.)</th>
                      <th className="pb-3 pr-4 text-right">Tax (Rs.)</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ash-100">
                    {invoices.filter(inv => inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase())).map((inv) => (
                      <tr key={inv.id} className="hover:bg-ash-50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-ash-600">{inv.invoice_number}</td>
                        <td className="py-3 pr-4 text-ash-600">#{inv.customer_id}</td>
                        <td className="py-3 pr-4 text-right font-medium text-ash-900">
                          {(inv.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right text-ash-600">
                          {(inv.tax || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-ash-600 text-xs">
                          {new Date(inv.created_at).toLocaleDateString('en-GB')}
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

      {/* ── PURCHASES TAB ── */}
      {tab === 'purchases' && (
        <>
          {purchaseSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="w-5 h-5 text-amber-700" />
                  <span className="text-sm font-medium text-amber-700">Total Spent</span>
                </div>
                <div className="text-2xl font-bold text-amber-800">
                  Rs. {(purchaseSummary.total_spent || 0).toLocaleString()}
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  All time vendor purchases
                </div>
              </div>

              <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="w-5 h-5 text-brand-600" />
                  <span className="text-sm font-medium text-brand-700">Total Orders Received</span>
                </div>
                <div className="text-2xl font-bold text-brand-800">
                  {purchaseSummary.total_purchases}
                </div>
                <div className="text-xs text-brand-600 mt-1">
                  Completed purchase orders
                </div>
              </div>

              <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <PackageCheck className="w-5 h-5 text-brand-600" />
                  <span className="text-sm font-medium text-brand-700">This Month</span>
                </div>
                <div className="text-2xl font-bold text-brand-800">
                  Rs. {(purchaseSummary.this_month_spent || 0).toLocaleString()}
                </div>
                <div className="text-xs text-brand-600 mt-1">
                  {purchaseSummary.this_month_purchases} orders this month
                </div>
              </div>
            </div>
          )}

          {/* PO Search */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={poSearch}
              onChange={(e) => setPoSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-ash-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
            {purchasesLoading ? (
              <div className="flex items-center justify-center h-40 text-ash-500 text-sm">
                Loading purchases...
              </div>
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-ash-500">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No received purchases yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ash-100 text-left text-xs uppercase text-ash-600 font-semibold">
                      <th className="pb-3 pr-4">Order #</th>
                      <th className="pb-3 pr-4">Product ID</th>
                      <th className="pb-3 pr-4">Supplier</th>
                      <th className="pb-3 pr-4 text-right">Qty</th>
                      <th className="pb-3 pr-4 text-right">Unit Cost (Rs.)</th>
                      <th className="pb-3 pr-4 text-right">Total (Rs.)</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ash-100">
                    {purchases.filter(po => po.order_number.toLowerCase().includes(poSearch.toLowerCase())).map((po) => (
                      <tr key={po.id} className="hover:bg-ash-50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-ash-600">{po.order_number}</td>
                        <td className="py-3 pr-4 text-ash-600">#{po.product_id}</td>
                        <td className="py-3 pr-4 text-ash-600 max-w-[140px] truncate">
                          {po.supplier || '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-ash-800">{po.quantity}</td>
                        <td className="py-3 pr-4 text-right text-ash-600">
                          {(po.unit_cost || 0).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-ash-900">
                          {(po.total_cost || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-xs text-ash-500">
                          {new Date(po.created_at).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ash-200">
                      <td colSpan={5} className="pt-3 pr-4 text-xs font-semibold text-ash-600 uppercase">
                        Total Spent
                      </td>
                      <td className="pt-3 pr-4 text-right font-bold text-ash-900">
                        {purchases.reduce((s, p) => s + (p.total_cost || 0), 0).toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
