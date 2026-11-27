'use client';

import { useEffect, useRef, useState } from 'react';
import { getPurchaseOrders, updatePOStatus } from '@/lib/api';
import { ClipboardList, RefreshCw, CheckCircle, XCircle, Clock, Send, PackageCheck, Search } from 'lucide-react';

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

const STATUS_FILTERS = ['', 'pending', 'approved', 'rejected', 'sent_to_vendor', 'received'];

const STATUS_DISPLAY: Record<string, string> = {
  pending:        'Pending',
  approved:       'Approved',
  rejected:       'Rejected',
  sent_to_vendor: 'Sent to Vendor',
  received:       'Received',
};

const statusStyle: Record<string, string> = {
  pending:        'bg-amber-50 text-amber-700',
  approved:       'bg-brand-50 text-brand-700',
  rejected:       'bg-red-50 text-red-700',
  sent_to_vendor: 'bg-brand-50 text-brand-700',
  received:       'bg-emerald-50 text-emerald-700',
};

const statusIcon: Record<string, React.ReactNode> = {
  pending:        <Clock className="w-3.5 h-3.5 text-amber-700" />,
  approved:       <CheckCircle className="w-3.5 h-3.5 text-brand-500" />,
  rejected:       <XCircle className="w-3.5 h-3.5 text-red-700" />,
  sent_to_vendor: <Send className="w-3.5 h-3.5 text-brand-500" />,
  received:       <PackageCheck className="w-3.5 h-3.5 text-emerald-700" />,
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  // Debounced copy of searchQuery - searching runs on the server, so we wait
  // for a pause in typing instead of firing a request per keystroke.
  const [searchTerm, setSearchTerm] = useState('');
  // Guards against a slow earlier response overwriting a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const load = () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    getPurchaseOrders({
      limit: 200,
      ...(statusFilter && { status: statusFilter }),
      ...(searchTerm && { search: searchTerm }),
    })
      .then((res) => {
        if (currentRequest === requestId.current) setOrders(res.data);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  };

  useEffect(() => { load(); }, [statusFilter, searchTerm]);

  // Auto-refresh every 30 seconds to pick up agent-driven status changes
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleAction = async (id: number, action: 'approved' | 'rejected' | 'received') => {
    if (action === 'rejected') {
      const reason = window.prompt('Enter rejection reason:');
      if (!reason) return;
    }
    setUpdating(id);
    try {
      const res = await updatePOStatus(id, action);
      const { status, email_sent } = res.data;
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      if (email_sent) alert(`PO approved and vendor email sent successfully.`);
    } catch {
      alert('Failed to update purchase order.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ash-900">Purchase Orders</h1>
          <p className="text-sm text-ash-600 mt-1">Approve orders to automatically email the vendor</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-ash-600 hover:text-ash-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500" />
        <input
          type="text"
          placeholder="Search by PO number or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-ash-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-surface text-ash-600 border border-ash-200 hover:border-brand-300'
            }`}
          >
            {s ? (STATUS_DISPLAY[s] || s) : 'All'}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-ash-500 text-sm">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-ash-500">
            <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-sm">No purchase orders found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ash-100 text-left text-xs uppercase text-ash-600 font-semibold">
                  <th className="pb-3 pr-4">Order #</th>
                  <th className="pb-3 pr-4">Product ID</th>
                  <th className="pb-3 pr-4 text-right">Qty</th>
                  <th className="pb-3 pr-4 text-right">Total (Rs.)</th>
                  <th className="pb-3 pr-4">Supplier</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-ash-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-ash-600">{o.order_number}</td>
                    <td className="py-3 pr-4 text-ash-600">#{o.product_id}</td>
                    <td className="py-3 pr-4 text-right font-medium text-ash-800">{o.quantity}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-ash-900">
                      {(o.total_cost || 0).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-ash-600 max-w-[120px] truncate">{o.supplier || '—'}</td>
                    <td className="py-3 pr-4 text-xs text-ash-500">
                      {new Date(o.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        statusStyle[o.status] || 'bg-ash-50 text-ash-600'
                      }`}>
                        {statusIcon[o.status]}
                        {STATUS_DISPLAY[o.status] || o.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {o.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            disabled={updating === o.id}
                            onClick={() => handleAction(o.id, 'approved')}
                            className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            disabled={updating === o.id}
                            onClick={() => handleAction(o.id, 'rejected')}
                            className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {o.status === 'sent_to_vendor' && (
                        <button
                          disabled={updating === o.id}
                          onClick={() => handleAction(o.id, 'received')}
                          className="px-2.5 py-1 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          Mark Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
