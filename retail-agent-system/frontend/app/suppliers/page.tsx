'use client';

import { useEffect, useRef, useState } from 'react';
import { getSuppliers, createSupplier } from '@/lib/api';
import { Truck, RefreshCw, Plus, X, Mail, Phone, Search } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  is_active: boolean;
}

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', contact_person: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Debounced copy of searchQuery — searching runs on the server, so we wait
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
    getSuppliers({ limit: 200, ...(searchTerm && { search: searchTerm }) })
      .then((res) => {
        if (currentRequest === requestId.current) setSuppliers(res.data);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  };

  useEffect(() => { load(); }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await createSupplier(form);
      setSuppliers((prev) => [...prev, res.data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ash-900">Suppliers</h1>
          <p className="text-sm text-ash-600 mt-1">Vendor contacts — email is used for purchase order notifications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-ash-600 hover:text-ash-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => { setShowForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Add Supplier Form */}
      {showForm && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ash-800">New Supplier</h2>
            <button onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }}>
              <X className="w-4 h-4 text-ash-500 hover:text-ash-600" />
            </button>
          </div>
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ash-600 mb-1 block">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm border border-ash-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Supplier company name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ash-600 mb-1 block">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full text-sm border border-ash-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ash-600 mb-1 block">Contact Person</label>
              <input
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full text-sm border border-ash-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Ali Khan"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ash-600 mb-1 block">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full text-sm border border-ash-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="+92 300 0000000"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-ash-600 mb-1 block">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full text-sm border border-ash-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Street, City"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Supplier'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(''); }}
                className="px-5 py-2 text-sm text-ash-600 border border-ash-200 rounded-lg hover:bg-ash-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500" />
        <input
          type="text"
          placeholder="Search by name, email or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-ash-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-ash-500 text-sm">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-ash-500">
            <Truck className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-sm">
              {searchTerm
                ? `No suppliers matching "${searchTerm}"`
                : 'No suppliers yet. Add one to enable vendor emails.'}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ash-100 text-left text-xs uppercase text-ash-600 font-semibold">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Contact Person</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-ash-50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-ash-900">{s.name}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={`mailto:${s.email}`}
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline text-xs"
                      >
                        <Mail className="w-3 h-3" />
                        {s.email}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-ash-600">{s.contact_person || '—'}</td>
                    <td className="py-3 pr-4">
                      {s.phone ? (
                        <span className="inline-flex items-center gap-1 text-ash-600 text-xs">
                          <Phone className="w-3 h-3" />
                          {s.phone}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-ash-100 text-ash-600'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
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
