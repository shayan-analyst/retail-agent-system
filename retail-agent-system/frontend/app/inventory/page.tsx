'use client';

import { useEffect, useRef, useState } from 'react';
import { getProducts, getCriticalStock } from '@/lib/api';
import ProductTable from '@/components/ProductTable';
import AlertBanner from '@/components/AlertBanner';
import { Package, AlertTriangle, RefreshCw, Search } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  reorder_level: number;
  supplier: string;
}

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Groceries', 'Beauty', 'Books', 'Home & Kitchen', 'Sports', 'Personal Care'];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [critical, setCritical] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'critical'>('all');
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  // Debounced copy of searchQuery — searching runs on the server, so we wait
  // for a pause in typing instead of firing a request per keystroke.
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  // Guards against a slow earlier response overwriting a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // A new search or category starts again from the first page.
  useEffect(() => { setPage(0); }, [searchTerm, category]);

  const load = () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    const params = {
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      ...(category !== 'All' && { category }),
      ...(searchTerm && { search: searchTerm }),
    };
    Promise.all([getProducts(params), getCriticalStock()])
      .then(([pRes, cRes]) => {
        if (currentRequest !== requestId.current) return;
        setProducts(pRes.data);
        setCritical(cRes.data);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  };

  useEffect(() => { load(); }, [page, category, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ash-900">Inventory</h1>
          <p className="text-sm text-ash-600 mt-1">Manage products and stock levels</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-ash-600 hover:text-ash-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <AlertBanner />

      {critical.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
          <div className="text-sm text-red-700">
            <span className="font-semibold">{critical.length} products</span> are below reorder level and need immediate attention.
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500" />
        <input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-ash-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ash-100 p-1 rounded-lg w-fit mb-5">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'bg-surface text-ash-900 shadow-sm' : 'text-ash-600 hover:text-ash-700'
          }`}
        >
          <Package className="w-4 h-4" />
          All Products
        </button>
        <button
          onClick={() => setActiveTab('critical')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'critical' ? 'bg-surface text-ash-900 shadow-sm' : 'text-ash-600 hover:text-ash-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Critical ({critical.length})
        </button>
      </div>

      {/* Category filter */}
      {activeTab === 'all' && (
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(0); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === c
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-ash-600 border border-ash-200 hover:border-brand-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="glass rounded-2xl border border-ash-200/70 shadow-glass p-4 sm:p-6 animate-fade-up">
        <ProductTable
          products={
            activeTab === 'all'
              ? products // already filtered by the server
              : critical.filter(p => {
                  const q = searchTerm.toLowerCase();
                  return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
                })
          }
          loading={loading}
        />

        {activeTab === 'all' && !loading && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-ash-50">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm text-ash-600 hover:text-ash-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-xs text-ash-500">Page {page + 1}</span>
            <button
              disabled={products.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-ash-600 hover:text-ash-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
