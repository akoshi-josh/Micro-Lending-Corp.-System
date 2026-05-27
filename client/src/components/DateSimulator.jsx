import { useState, useEffect } from 'react';
import {
  getSimulatedDate,
  setSimulatedDate,
  clearSimulatedDate,
  getToday
} from '../utils/simulatedDate';

export default function DateSimulator() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [active, setActive] = useState(false);
  const [currentSim, setCurrentSim] = useState(null);

  useEffect(() => {
    const existing = getSimulatedDate();
    if (existing) {
      setDate(existing);
      setActive(true);
      setCurrentSim(existing);
    }
  }, []);

  const handleApply = () => {
    if (!date) return;
    setSimulatedDate(date);
    setActive(true);
    setCurrentSim(date);
    setOpen(false);
    window.location.reload();
  };

  const handleClear = () => {
    clearSimulatedDate();
    setDate('');
    setActive(false);
    setCurrentSim(null);
    setOpen(false);
    window.location.reload();
  };

  const setPreset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const str = d.toISOString().split('T')[0];
    setDate(str);
  };

  const formatDisplay = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: '2-digit'
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-bold transition-all ${
          active
            ? 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse'
            : 'bg-gray-800 text-white hover:bg-gray-700'
        }`}
      >
        🧪 {active ? `Simulating: ${formatDisplay(currentSim)}` : 'Date Simulator'}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-14 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-5 w-80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-gray-800">🧪 Date Simulator</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Testing only — simulates system date
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            >×</button>
          </div>

          {/* Real date */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
            <div className="text-xs text-gray-500">
              <span className="font-semibold">Real today:</span>{' '}
              {new Date().toLocaleDateString('en-PH', {
                year: 'numeric', month: 'long', day: '2-digit'
              })}
            </div>
          </div>

          {/* Active simulation notice */}
          {active && currentSim && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
              <div className="text-xs text-orange-700 font-semibold">
                ⚠ Currently simulating:
              </div>
              <div className="text-sm text-orange-800 font-bold mt-0.5">
                {formatDisplay(currentSim)}
              </div>
            </div>
          )}

          {/* Date picker */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Set Simulated Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Quick presets */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Quick presets:</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '+7 days', days: 7 },
                { label: '+1 month', days: 30 },
                { label: '+2 months', days: 60 },
                { label: '+3 months', days: 90 },
                { label: '+6 months', days: 180 },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setPreset(preset.days)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg font-medium"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {active && (
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                🔄 Reset
              </button>
            )}
            <button
              onClick={handleApply}
              disabled={!date}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-40"
            >
              Apply ↗
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-400 text-center">
            Stored in localStorage — persists after reload
          </div>
        </div>
      )}
    </div>
  );
}