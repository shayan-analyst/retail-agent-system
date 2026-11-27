'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Store, Loader2, Eye, EyeOff, Boxes, LineChart, Bot, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login: authLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      await authLogin(res.data.access_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
            'Invalid credentials. Please try again.'
          : 'Invalid credentials. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Boxes, title: 'Inventory & stock alerts', text: 'Track every SKU and catch low stock before the shelf runs empty.' },
    { icon: LineChart, title: 'Sales & accounting', text: 'Daily revenue, payments, invoices and profit in one view.' },
    { icon: Bot, title: 'AI store assistant', text: 'Ask questions in plain language and get answers from your own data.' },
  ];

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center p-4 lg:p-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle variant="icon" />
      </div>

      <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Brand / value panel */}
        <section className="hidden lg:block animate-fade-up">
          <div className="mb-8 inline-flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow">
              <Store className="h-6 w-6" />
            </div>
            <span className="text-lg font-bold tracking-tight text-ash-900">Retail Agent</span>
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-ash-900">
            Run your store
            <span className="block bg-gradient-to-r from-brand-500 to-brand-800 bg-clip-text text-transparent">
              smarter, every day.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ash-600">
            One workspace for stock, sales, suppliers, customers and accounts, with an AI assistant that works from your live store data.
          </p>
          <ul className="mt-9 space-y-4">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ash-900">{title}</div>
                  <div className="text-sm text-ash-600">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Sign-in card */}
        <div className="glass animate-fade-up mx-auto w-full max-w-md rounded-3xl border border-ash-200/70 p-8 shadow-glass">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 p-3 text-white shadow-glow">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ash-900">Retail Agent System</h1>
              <p className="text-xs text-ash-600">Store operations platform</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ash-900">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-ash-600">Sign in to manage your store.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ash-700 mb-1.5">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full rounded-xl border border-ash-200 bg-surface/70 px-4 py-2.5 text-sm text-ash-900 placeholder:text-ash-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ash-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-ash-200 bg-surface/70 py-2.5 pl-4 pr-11 text-sm text-ash-900 placeholder:text-ash-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ash-500 transition hover:text-ash-800"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ash-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Authorised staff only
          </p>
        </div>
      </div>
    </div>
  );
}
