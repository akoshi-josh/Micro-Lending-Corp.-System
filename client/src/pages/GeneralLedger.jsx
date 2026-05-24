import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function GeneralLedger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const printRef = useRef();

  const fetchLedger = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    api.get(`/api/ledger/general?${params}`)
      .then(res => setEntries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLedger(); }, [month, year]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'MicroLend — General Ledger',
  });

  const totals = entries.reduce((acc, e) => ({
    debit: acc.debit + parseFloat(e.debit || 0),
    credit: acc.credit + parseFloat(e.credit || 0),
  }), { debit: 0, credit: 0 });

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const years = ['2023', '2024', '2025', '2026', '2027'];

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex gap-3">
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(month || year) && (
            <button onClick={() => { setMonth(''); setYear(''); }}
              className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 border border-gray-200 rounded-lg bg-white">
              Clear
            </button>
          )}
        </div>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800"
        >
          🖨️ Print Ledger
        </button>
      </div>

      <div ref={printRef}>
        {/* Print Header */}
        <div className="hidden print:block mb-6 text-center pb-4 border-b">
          <div className="text-lg font-bold">L.A. and M.J. Micro Lending Corporation</div>
          <div className="text-base font-semibold mt-1">General Ledger</div>
          <div className="text-xs text-gray-400 mt-1">Printed: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' })}</div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Debit (Money In)</div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(totals.debit)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Credit (Money Out)</div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(totals.credit)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Net Balance</div>
            <div className={`text-xl font-bold ${totals.debit - totals.credit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {formatCurrency(totals.debit - totals.credit)}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 no-print">
            <span className="text-base font-bold text-gray-800">General Ledger — All Transactions</span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Reference No.</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Account Name</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Description</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-green-600">Debit (In)</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-red-500">Credit (Out)</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No transactions found.
                    </td>
                  </tr>
                )}
                {entries.map((e, i) => (
                  <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${e.entry_type === 'voucher' ? 'bg-red-50' : ''}`}>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(e.transaction_date)}</td>
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">{e.reference_no}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{e.account_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{e.description}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                      {parseFloat(e.debit) > 0 ? formatCurrency(e.debit) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-500">
                      {parseFloat(e.credit) > 0 ? formatCurrency(e.credit) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">
                      {formatCurrency(e.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={4} className="px-5 py-3 text-sm font-bold text-blue-700">TOTALS</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-green-700">{formatCurrency(totals.debit)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(totals.credit)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">{formatCurrency(totals.debit - totals.credit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}