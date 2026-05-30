import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

// ─── Verification Code Input ───────────────────────────────────────────────
function VerificationCodeInput({ code, onVerified, onCancel }) {
  const [inputs, setInputs] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const refs = useRef([]);

  const handleChange = (i, val) => {
    // Only allow alphanumeric
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-1);
    const next = [...inputs];
    next[i] = clean;
    setInputs(next);
    setError('');
    if (clean && i < 5) refs.current[i + 1]?.focus();

    // Auto-verify when all filled
    if (clean && i === 5) {
      const entered = [...next].join('');
      if (entered === code) {
        onVerified();
      } else {
        setShaking(true);
        setError('Incorrect code. Try again.');
        setTimeout(() => {
          setShaking(false);
          setInputs(['', '', '', '', '', '']);
          refs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !inputs[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    // Block paste entirely
    setError('Copying & pasting is not allowed. Type the code manually.');
  };

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600 mb-1 font-medium">
        Enter the verification code to proceed:
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
        <span className="text-amber-600 text-base mt-0.5">🔐</span>
        <div>
          <p className="text-xs font-bold text-amber-700 mb-0.5">Your verification code</p>
          <div className="flex gap-1.5">
            {code.split('').map((ch, i) => (
              <span key={i}
                className="w-8 h-9 bg-white border-2 border-amber-300 rounded-lg flex items-center justify-center text-base font-black text-amber-800 tracking-widest select-none">
                {ch}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-1">⚠ Type this code below — copy/paste is blocked</p>
        </div>
      </div>

      <div className={`flex gap-2 mb-2 ${shaking ? 'animate-bounce' : ''}`}>
        {inputs.map((val, i) => (
          <input
            key={i}
            ref={el => refs.current[i] = el}
            type="text"
            maxLength={1}
            value={val}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onContextMenu={e => e.preventDefault()}
            autoComplete="off"
            className={`w-11 h-12 border-2 rounded-xl text-center text-base font-bold outline-none transition-all ${
              val
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-800'
            } ${error ? 'border-red-400 bg-red-50' : ''}`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-xs font-medium mb-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <button onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Generate random 6-char alphanumeric code ──────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Change Username Section ───────────────────────────────────────────────
function ChangeUsernameSection() {
  const [step, setStep] = useState('form'); // form | verify | done
  const [form, setForm] = useState({ current_username: '', new_username: '', confirm_username: '' });
  const [errors, setErrors] = useState({});
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.current_username) e.current_username = 'Current username required';
    if (!form.new_username) e.new_username = 'New username required';
    if (form.new_username.length < 3) e.new_username = 'Username must be at least 3 characters';
    if (form.new_username !== form.confirm_username) e.confirm_username = 'Usernames do not match';
    if (form.new_username === form.current_username) e.new_username = 'New username must be different';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceed = () => {
    if (!validate()) return;
    setCode(generateCode());
    setStep('verify');
  };

  const handleVerified = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/credentials', {
        type: 'username',
        current_username: form.current_username,
        new_username: form.new_username,
      });
      setStep('done');
      setForm({ current_username: '', new_username: '', confirm_username: '' });
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Failed to update username.' });
      setStep('form');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (step === 'done') return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">✅</span>
      <div>
        <div className="text-sm font-bold text-green-700">Username updated successfully!</div>
        <div className="text-xs text-green-600 mt-0.5">Use your new username to log in next time.</div>
      </div>
      <button onClick={() => setStep('form')} className="ml-auto text-xs text-green-600 hover:underline">
        Change again
      </button>
    </div>
  );

  return (
    <div>
      {step === 'form' && (
        <div className="space-y-3">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium">
              ⚠ {errors.submit}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Current Username</label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.current_username ? 'border-red-400' : 'border-gray-300'}`}
              value={form.current_username}
              onChange={e => set('current_username', e.target.value)}
              placeholder="Enter your current username"
              autoComplete="off"
            />
            {errors.current_username && <p className="text-red-500 text-xs mt-1">{errors.current_username}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">New Username</label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.new_username ? 'border-red-400' : 'border-gray-300'}`}
              value={form.new_username}
              onChange={e => set('new_username', e.target.value)}
              placeholder="Enter new username"
              autoComplete="off"
            />
            {errors.new_username && <p className="text-red-500 text-xs mt-1">{errors.new_username}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Confirm New Username</label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.confirm_username ? 'border-red-400' : 'border-gray-300'}`}
              value={form.confirm_username}
              onChange={e => set('confirm_username', e.target.value)}
              placeholder="Re-enter new username"
              autoComplete="off"
            />
            {errors.confirm_username && <p className="text-red-500 text-xs mt-1">{errors.confirm_username}</p>}
          </div>
          <button onClick={handleProceed}
            className="w-full py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors">
            Continue →
          </button>
        </div>
      )}

      {step === 'verify' && (
        <VerificationCodeInput
          code={code}
          onVerified={handleVerified}
          onCancel={() => setStep('form')}
        />
      )}
    </div>
  );
}

// ─── Change Password Section ───────────────────────────────────────────────
function ChangePasswordSection() {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.current_password) e.current_password = 'Current password required';
    if (!form.new_password) e.new_password = 'New password required';
    if (form.new_password.length < 6) e.new_password = 'Password must be at least 6 characters';
    if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    if (form.new_password === form.current_password) e.new_password = 'New password must be different';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceed = () => {
    if (!validate()) return;
    setCode(generateCode());
    setStep('verify');
  };

  const handleVerified = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/credentials', {
        type: 'password',
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setStep('done');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Failed to update password.' });
      setStep('form');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const strength = (() => {
    const p = form.new_password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-400', text: 'text-red-600', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-yellow-400', text: 'text-yellow-600', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-blue-400', text: 'text-blue-600', width: '65%' };
    return { label: 'Strong', color: 'bg-green-500', text: 'text-green-600', width: '100%' };
  })();

  if (step === 'done') return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">✅</span>
      <div>
        <div className="text-sm font-bold text-green-700">Password updated successfully!</div>
        <div className="text-xs text-green-600 mt-0.5">Use your new password on next login.</div>
      </div>
      <button onClick={() => setStep('form')} className="ml-auto text-xs text-green-600 hover:underline">
        Change again
      </button>
    </div>
  );

  return (
    <div>
      {step === 'form' && (
        <div className="space-y-3">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium">
              ⚠ {errors.submit}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 ${errors.current_password ? 'border-red-400' : 'border-gray-300'}`}
                value={form.current_password}
                onChange={e => set('current_password', e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showCurrent ? '🙈' : '👁'}
              </button>
            </div>
            {errors.current_password && <p className="text-red-500 text-xs mt-1">{errors.current_password}</p>}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 ${errors.new_password ? 'border-red-400' : 'border-gray-300'}`}
                value={form.new_password}
                onChange={e => set('new_password', e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showNew ? '🙈' : '👁'}
              </button>
            </div>
            {/* Strength bar */}
            {strength && (
              <div className="mt-1.5">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${strength.color}`}
                    style={{ width: strength.width }} />
                </div>
                <p className={`text-xs mt-0.5 font-medium ${strength.text}`}>{strength.label} password</p>
              </div>
            )}
            {errors.new_password && <p className="text-red-500 text-xs mt-1">{errors.new_password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 ${errors.confirm_password ? 'border-red-400' : 'border-gray-300'}`}
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
            {form.confirm_password && form.new_password && (
              <p className={`text-xs mt-1 font-medium ${form.new_password === form.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                {form.new_password === form.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
            {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>}
          </div>

          <button onClick={handleProceed}
            className="w-full py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors">
            Continue →
          </button>
        </div>
      )}

      {step === 'verify' && (
        <VerificationCodeInput
          code={code}
          onVerified={handleVerified}
          onCancel={() => setStep('form')}
        />
      )}
    </div>
  );
}

// ─── Main Settings Component ───────────────────────────────────────────────
export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [settings, setSettings] = useState({
    default_rate: '5',
    default_frequency: 'monthly',
    penalty_rate: '2',
    grace_period: '3',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCredTab, setActiveCredTab] = useState('username'); // username | password

  useEffect(() => {
    api.get('/api/expenses/categories').then(res => setCategories(res.data));
    api.get('/api/settings').then(res => {
      setSettings({
        default_rate: res.data.default_rate,
        default_frequency: res.data.default_frequency,
        penalty_rate: res.data.penalty_rate,
        grace_period: res.data.grace_period,
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/api/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Error saving settings.');
    }
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      await api.post('/api/expenses/categories', { name: newCat.trim() });
      const res = await api.get('/api/expenses/categories');
      setCategories(res.data);
      setNewCat('');
    } catch {
      alert('Category already exists or error adding.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>
  );

  return (
    <div className="max-w-3xl space-y-4">

      {/* ── Interest & Penalty Config ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          ⚙️ Interest & Penalty Configuration
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Default Interest Rate (%)</label>
            <input type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.default_rate}
              onChange={e => setSettings(s => ({ ...s, default_rate: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Applied as flat rate to new loans</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Default Payment Frequency</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.default_frequency}
              onChange={e => setSettings(s => ({ ...s, default_frequency: e.target.value }))}>
              <option value="weekly">Weekly</option>
              <option value="semi_monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Pre-selected in new loan form</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Penalty Rate (% per missed period)</label>
            <input type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.penalty_rate}
              onChange={e => setSettings(s => ({ ...s, penalty_rate: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Applied after grace period expires</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Grace Period (days)</label>
            <input type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.grace_period}
              onChange={e => setSettings(s => ({ ...s, grace_period: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Days before penalty is charged after due date</p>
          </div>
        </div>
      </div>

      {/* ── Payment Schedule Rules ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          📅 Payment Schedule Rules
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
          {[
            { label: 'Weekly', desc: 'Monthly total ÷ 4 = per-week payment.' },
            { label: 'Semi-Monthly', desc: 'Monthly total ÷ 2 = bi-weekly payment.' },
            { label: 'Monthly', desc: 'Full monthly amount due once per month.' },
          ].map(r => (
            <div key={r.label} className="flex gap-2">
              <span className="font-bold text-blue-700 w-32">{r.label}:</span>
              <span>{r.desc}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-blue-200">
            <span className="font-bold text-blue-700 w-32">Formula:</span>
            <span>Total Payable = Loan + (Loan × Interest Rate %)</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-700 w-32">Penalty:</span>
            <span>
              {settings.penalty_rate}% of missed period amount, applied after {settings.grace_period} day grace period.
            </span>
          </div>
        </div>
      </div>

      {/* ── Expense Categories ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          📂 Expense Categories
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(c => (
            <span key={c.id}
              className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-semibold">
              {c.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            placeholder="New category name..."
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">
            + Add
          </button>
        </div>
      </div>

      {/* ── Account Security ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-base font-bold text-gray-800">🔒 Account Security</div>
          <p className="text-xs text-gray-400 mt-0.5">
            Change your admin username or password. A verification code is required to confirm each change.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'username', label: '👤 Change Username' },
            { id: 'password', label: '🔑 Change Password' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveCredTab(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeCredTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeCredTab === 'username' && <ChangeUsernameSection />}
          {activeCredTab === 'password' && <ChangePasswordSection />}
        </div>
      </div>

      {/* ── Save Settings Button ── */}
      <div className="flex justify-end pb-4">
        <button onClick={handleSave}
          className="px-8 py-3 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors flex items-center gap-2">
          {saved ? (
            <><span>✓</span> Saved!</>
          ) : (
            'Save Settings ↗'
          )}
        </button>
      </div>
    </div>
  );
}