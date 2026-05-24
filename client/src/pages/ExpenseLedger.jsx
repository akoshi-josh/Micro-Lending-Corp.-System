import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ExpenseLedger() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    api.get('/api/expenses').then(res => setExpenses(res.data));
    api.get('/api/expenses/categories').then(res => setCategories(res.data)).finally(() => setLoading(false));
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'MicroLend — Expense Ledger',
  });

  const filtered = expenses.filter(e => !filterCat || e.category_name === filterCat);
  const total = filtered.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const byCategory = categories.map(c => ({
    name: c.name,
    total: expenses.filter(e => e.category_name === c.name).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  }));

  return (
    <div>
      {/* Category Summary */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {byCategory.map((c, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">{c.name}</div>
            <div className="text-lg font-bold text-red-600">{formatCurrency(c.total)}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 no-print">
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <button onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">
          🖨️ Print Ledger
        </button>
      </div>

      <div ref={printRef}>
        <div className="hidden print:block mb-6 text-center pb-4 border-b">
          <div className="text-lg font-bold">L.A. and M.J. Micro Lending Corporation</div>
          <div className="text-base font-semibold mt-1">Expense Ledger</div>
          <div className="text-xs text-gray-400 mt-1">Printed: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' })}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center no-print">
            <span className="text-base font-bold text-gray-800">Expense Ledger</span>
            <span className="text-lg font-bold text-red-600">Total: {formatCurrency(total)}</span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Reference</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Category</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Paid To</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Description</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No expenses found.</td></tr>
                )}
                {filtered.map((e, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(e.voucher_date)}</td>
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">{e.voucher_number}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{e.category_name || '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{e.payable_to}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{e.description || '—'}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-red-50 border-t-2 border-red-200">
                    <td colSpan={5} className="px-5 py-3 text-sm font-bold text-red-700">TOTAL EXPENSES</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-700">{formatCurrency(total)}</td>
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