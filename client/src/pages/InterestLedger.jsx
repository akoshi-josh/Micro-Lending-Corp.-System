import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';

export default function InterestLedger() {
  const [entries, setEntries] = useState([]);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    api.get('/api/ledger/interest').then(res => setEntries(res.data));
    api.get('/api/vouchers').then(res => {
      const total = res.data.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0);
      setExpenses(total);
    }).finally(() => setLoading(false));
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'MicroLend — Interest Ledger',
  });

  const totalInterest = entries.length > 0
    ? parseFloat(entries[entries.length - 1]?.cumulative_interest || 0)
    : 0;

  const thisMonth = entries
    .filter(e => new Date(e.payment_date).getMonth() === new Date().getMonth()
      && new Date(e.payment_date).getFullYear() === new Date().getFullYear())
    .reduce((sum, e) => sum + parseFloat(e.interest_collected || 0), 0);

  const avgRate = entries.length > 0
    ? entries.reduce((sum, e) => sum + parseFloat(e.interest_rate || 0), 0) / entries.length
    : 0;

  const netProfit = totalInterest - expenses;

  return (
    <div>
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-medium mb-1">Total Interest Earned</div>
          <div className="text-xl font-bold text-purple-700">{formatCurrency(totalInterest)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-medium mb-1">This Month</div>
          <div className="text-xl font-bold text-blue-700">{formatCurrency(thisMonth)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-medium mb-1">Average Rate</div>
          <div className="text-xl font-bold text-green-700">{formatPercent(avgRate)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
          <div className="text-xs text-gray-500 font-medium mb-1">Net Profit (Less Expenses)</div>
          <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4 no-print">
        <button onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">
          🖨️ Print Ledger
        </button>
      </div>

      <div ref={printRef}>
        <div className="hidden print:block mb-6 text-center pb-4 border-b">
          <div className="text-lg font-bold">L.A. and M.J. Micro Lending Corporation</div>
          <div className="text-base font-semibold mt-1">Interest Ledger</div>
          <div className="text-xs text-gray-400 mt-1">Printed: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' })}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 no-print">
            <span className="text-base font-bold text-gray-800">Interest Ledger — All Interest Transactions</span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Reference</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Principal Paid</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Rate</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Interest Amount</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No interest records yet.
                    </td>
                  </tr>
                )}
                {entries.map((e, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(e.payment_date)}</td>
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">{e.reference_no}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{e.borrower_name}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">{formatCurrency(e.amount_paid)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">{formatPercent(e.interest_rate)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-600">{formatCurrency(e.interest_collected)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">{formatCurrency(e.cumulative_interest)}</td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-purple-50 border-t-2 border-purple-200">
                    <td colSpan={5} className="px-5 py-3 text-sm font-bold text-purple-700">TOTAL INTEREST EARNED</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-700">{formatCurrency(totalInterest)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-700">{formatCurrency(totalInterest)}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td colSpan={5} className="px-5 py-3 text-sm font-bold text-red-600">LESS: Total Expenses (Cash Vouchers)</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(expenses)}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-green-50 border-t-2 border-green-200">
                    <td colSpan={5} className="px-5 py-3 text-sm font-bold text-green-700">NET PROFIT</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-green-700">{formatCurrency(netProfit)}</td>
                    <td></td>
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