'use client';

import { useEffect, useState } from 'react';
import { getComplaints, updateComplaintStatus } from '@/lib/api';
import { MessageCircleWarning, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Complaint {
  id: number;
  customer_id: number;
  complaint: string;
  reference: string;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ['received', 'in_progress', 'resolved'];

const statusStyle: Record<string, string> = {
  received:    'bg-amber-50 text-amber-700',
  in_progress: 'bg-brand-50 text-brand-700',
  resolved:    'bg-emerald-50 text-emerald-700',
};

const statusIcon: Record<string, React.ReactNode> = {
  received:    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-brand-500" />,
  resolved:    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />,
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getComplaints(statusFilter ? { status: statusFilter } : {})
      .then((res) => setComplaints(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdating(id);
    try {
      await updateComplaintStatus(id, newStatus);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ash-900">Complaints</h1>
          <p className="text-sm text-ash-600 mt-1">Customer complaints — resolving sends email automatically</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-ash-600 hover:text-ash-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['', ...STATUS_OPTIONS].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-surface text-ash-600 border border-ash-200 hover:border-brand-300'
            }`}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-ash-500 text-sm">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-ash-500">
            <MessageCircleWarning className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-sm">No complaints found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ash-100 text-left text-xs uppercase text-ash-600 font-semibold">
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Customer ID</th>
                  <th className="pb-3 pr-4">Complaint</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-ash-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-ash-600">{c.reference}</td>
                    <td className="py-3 pr-4 text-ash-600">#{c.customer_id}</td>
                    <td className="py-3 pr-4 text-ash-800 max-w-xs truncate" title={c.complaint}>
                      {c.complaint}
                    </td>
                    <td className="py-3 pr-4 text-xs text-ash-500">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        statusStyle[c.status] || 'bg-ash-50 text-ash-600'
                      }`}>
                        {statusIcon[c.status]}
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <select
                        value={c.status}
                        disabled={updating === c.id || c.status === 'resolved'}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        className="text-xs border border-ash-200 rounded-lg px-2 py-1.5 bg-surface text-ash-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
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
