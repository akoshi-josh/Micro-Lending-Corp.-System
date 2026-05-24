import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form,     setForm]     = useState({ username: '', password: '' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Load Roboto from Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen flex" style={{ fontFamily: "'Roboto', sans-serif" }}>

        {/* ── LEFT PANEL ── */}
        <div className="hidden md:flex md:w-5/12 lg:w-[48%] bg-blue-900 flex-col items-center justify-center px-10 lg:px-14 py-16 relative overflow-hidden">

          {/* Decorative rings */}
          <div className="absolute -top-36 -right-36 w-[420px] h-[420px] rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full border border-white/[0.04] pointer-events-none" />

          <div className="relative z-10 text-center max-w-xs">

            {/* Emblem */}
            <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-yellow-400/50 flex items-center justify-center mx-auto mb-7 text-3xl shadow-[0_0_0_10px_rgba(255,255,255,0.03)]">
              💰
            </div>

            {/* Gold divider */}
            <div className="w-12 h-0.5 bg-yellow-400 rounded-full mx-auto mb-7" />

            {/* Corporation name */}
            <h1 className="text-white font-bold text-2xl lg:text-[1.75rem] leading-snug tracking-tight mb-5">
              L.A and M.J. Micro Lending Corporation
            </h1>

            {/* Address */}
            <address className="not-italic text-white/50 text-sm leading-relaxed">
              <span className="block">P-5 Pob1 (Agay)</span>
              <span className="block">R.T. Romualdez</span>
            </address>

            {/* Badge */}
            <div className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.07] border border-yellow-400/25">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
              <span className="text-white/60 text-[0.68rem] font-medium tracking-widest uppercase">
                Lending Management System
              </span>
            </div>

          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 bg-white flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm">

            {/* Mobile header */}
            <div className="flex md:hidden flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-full bg-blue-900 flex items-center justify-center text-2xl mb-3 border-2 border-yellow-400/50">
                💰
              </div>
              <p className="text-blue-900 font-bold text-sm text-center leading-snug">
                L.A and M.J. Micro Lending Corporation
              </p>
            </div>

            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="block w-5 h-0.5 bg-yellow-500 rounded-full" />
              <span className="text-blue-700 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
                Staff Portal
              </span>
            </div>

            <h2 className="text-[#0d1f4a] text-[1.9rem] font-black tracking-tight leading-tight mb-1.5">
              Welcome back
            </h2>
            <p className="text-slate-400 text-sm font-normal mb-9">
              Sign in to access your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-[0.72rem] font-bold text-slate-600 uppercase tracking-[0.07em] mb-1.5"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[0.9rem] font-normal text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  style={{ fontFamily: "'Roboto', sans-serif" }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[0.72rem] font-bold text-slate-600 uppercase tracking-[0.07em] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-16 border border-slate-200 rounded-xl text-[0.9rem] font-normal text-slate-800 placeholder-slate-300 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    style={{ fontFamily: "'Roboto', sans-serif" }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.74rem] font-medium text-slate-400 hover:text-blue-700 transition px-1.5 py-1 rounded"
                    style={{ fontFamily: "'Roboto', sans-serif" }}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200/70 text-red-600 text-[0.82rem] font-normal px-4 py-3 rounded-xl">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[0.9rem] py-3 rounded-xl transition-all duration-200 hover:-translate-y-px shadow-[0_4px_16px_rgba(26,60,143,0.25)] hover:shadow-[0_6px_20px_rgba(26,60,143,0.3)] overflow-hidden group mt-1"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

            </form>

            <p className="text-center text-[0.74rem] font-normal text-slate-400 mt-7 pt-5 border-t border-slate-100">
              Single admin access only
            </p>

          </div>
        </div>

      </div>
    </>
  );
}