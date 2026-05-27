import { useState, useEffect } from 'react';
import api from '../utils/api';

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
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      Loading...
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* Interest Config */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          ⚙️ Interest & Penalty Configuration
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Default Interest Rate (%)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.default_rate}
              onChange={e => setSettings(s => ({ ...s, default_rate: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Applied as flat rate to new loans
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Default Payment Frequency
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.default_frequency}
              onChange={e => setSettings(s => ({ ...s, default_frequency: e.target.value }))}
            >
              <option value="weekly">Weekly</option>
              <option value="semi_monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Pre-selected in new loan form
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Penalty Rate (% per missed period)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.penalty_rate}
              onChange={e => setSettings(s => ({ ...s, penalty_rate: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Applied after grace period expires
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Grace Period (days)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={settings.grace_period}
              onChange={e => setSettings(s => ({ ...s, grace_period: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Days before penalty is charged after due date
            </p>
          </div>
        </div>
      </div>

      {/* Payment Schedule Rules */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          📅 Payment Schedule Rules
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
          <div className="flex gap-2">
            <span className="font-bold text-blue-700 w-32">Weekly:</span>
            <span>Monthly total ÷ 4 = per-week payment.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-700 w-32">Semi-Monthly:</span>
            <span>Monthly total ÷ 2 = bi-weekly payment.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-700 w-32">Monthly:</span>
            <span>Full monthly amount due once per month.</span>
          </div>
          <div className="flex gap-2 pt-2 border-t border-blue-200">
            <span className="font-bold text-blue-700 w-32">Formula:</span>
            <span>Total Payable = Loan + (Loan × Interest Rate %)</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-700 w-32">Penalty:</span>
            <span>
              {settings.penalty_rate}% of missed period amount,
              applied after {settings.grace_period} day grace period.
            </span>
          </div>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          📂 Expense Categories
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(c => (
            <span
              key={c.id}
              className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-semibold"
            >
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
          <button
            onClick={addCategory}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800"
          >
            + Add
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800"
        >
          {saved ? '✓ Saved!' : 'Save Settings ↗'}
        </button>
      </div>
    </div>
  );
}