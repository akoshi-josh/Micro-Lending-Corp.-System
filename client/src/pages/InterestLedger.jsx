import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';

export default function InterestLedger() {
  const [entries, setEntries] = useState([]);
  const [penalties, setPenalties] = useState([]);
    const [expenses, setExpenses] = useState(0);
    const [totalCollected, setTotalCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    api.get('/api/ledger/interest').then(res => setEntries(res.data));
api.get('/api/vouchers').then(res => {
  const total = res.data.reduce(
    (sum, v) => sum + parseFloat(v.amount || 0), 0
  );
  setExpenses(total);
});
api.get('/api/payments').then(res => {
  const total = res.data.reduce(
    (sum, p) => sum + parseFloat(p.amount_paid || 0), 0
  );
  setTotalCollected(total);
});
    // Get all payments that have penalty_amount > 0
    api.get('/api/payments').then(res => {
      const penaltyPayments = res.data.filter(
        p => parseFloat(p.penalty_amount || 0) > 0
      );
      setPenalties(penaltyPayments);
    }).finally(() => setLoading(false));
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'MicroLend — Interest & Profit Ledger',
  });

  // Total interest from payments
  const totalInterest = entries.length > 0
    ? parseFloat(entries[entries.length - 1]?.cumulative_interest || 0)
    : 0;

  // Total penalty collected
  const totalPenalty = penalties.reduce(
    (sum, p) => sum + parseFloat(p.penalty_amount || 0), 0
  );

  // This month interest
  const thisMonth = entries
    .filter(e =>
      new Date(e.payment_date).getMonth() === new Date().getMonth() &&
      new Date(e.payment_date).getFullYear() === new Date().getFullYear()
    )
    .reduce((sum, e) => sum + parseFloat(e.interest_collected || 0), 0);

  // This month penalty
  const thisMonthPenalty = penalties
    .filter(p =>
      new Date(p.payment_date).getMonth() === new Date().getMonth() &&
      new Date(p.payment_date).getFullYear() === new Date().getFullYear()
    )
    .reduce((sum, p) => sum + parseFloat(p.penalty_amount || 0), 0);

  const avgRate = entries.length > 0
    ? entries.reduce((sum, e) => sum + parseFloat(e.interest_rate || 0), 0) /
      entries.length
    : 0;
// Net Profit = Interest + Penalty only (no voucher deduction)
const totalIncome = totalInterest + totalPenalty;
const netProfit = totalIncome;

// Cash on Hand = Total Collected - Cash Vouchers
const cashOnHand = totalCollected - expenses;

  return (
    <div>
      {/* Metric Cards */}
{/* Metric Cards */}
<div className="grid grid-cols-4 gap-3 mb-4">
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
    <div className="text-xs text-gray-500 font-medium mb-1">
      Total Interest Earned
    </div>
    <div className="text-xl font-bold text-purple-700">
      {formatCurrency(totalInterest)}
    </div>
    <div className="text-xs text-gray-400 mt-1">From loan payments</div>
  </div>
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
    <div className="text-xs text-gray-500 font-medium mb-1">
      Total Penalty Collected
    </div>
    <div className="text-xl font-bold text-red-600">
      {formatCurrency(totalPenalty)}
    </div>
    <div className="text-xs text-gray-400 mt-1">From overdue periods</div>
  </div>
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
    <div className="text-xs text-gray-500 font-medium mb-1">
      Net Profit
    </div>
    <div className="text-xl font-bold text-green-700">
      {formatCurrency(netProfit)}
    </div>
    <div className="text-xs text-gray-400 mt-1">Interest + Penalty</div>
  </div>
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
    <div className="text-xs text-gray-500 font-medium mb-1">
      Cash on Hand
    </div>
    <div className={`text-xl font-bold ${cashOnHand >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
      {formatCurrency(cashOnHand)}
    </div>
    <div className="text-xs text-gray-400 mt-1">Collected − Vouchers</div>
  </div>
</div>

{/* Net Profit Breakdown */}
<div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
  <div className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">
    📊 Profit & Cash Breakdown
  </div>
  <div className="grid grid-cols-2 gap-6">
    {/* Left — Net Profit */}
    <div className="space-y-2 text-sm">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Net Profit
      </div>
      <div className="flex justify-between items-center py-1">
        <span className="text-gray-600">Total Interest Earned</span>
        <span className="font-bold text-purple-700">
          {formatCurrency(totalInterest)}
        </span>
      </div>
      <div className="flex justify-between items-center py-1">
        <span className="text-gray-600">Total Penalty Collected</span>
        <span className="font-bold text-red-600">
          + {formatCurrency(totalPenalty)}
        </span>
      </div>
      <div className="flex justify-between items-center py-2 border-t-2 border-gray-200">
        <span className="text-base font-bold text-gray-800">NET PROFIT</span>
        <span className="text-base font-bold text-green-700">
          {formatCurrency(netProfit)}
        </span>
      </div>
    </div>

    {/* Right — Cash on Hand */}
    <div className="space-y-2 text-sm">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Cash on Hand
      </div>
      <div className="flex justify-between items-center py-1">
        <span className="text-gray-600">Total Collected</span>
        <span className="font-bold text-green-700">
          {formatCurrency(totalCollected)}
        </span>
      </div>
      <div className="flex justify-between items-center py-1">
        <span className="text-gray-600">Less: Cash Vouchers</span>
        <span className="font-bold text-red-500">
          − {formatCurrency(expenses)}
        </span>
      </div>
      <div className="flex justify-between items-center py-2 border-t-2 border-gray-200">
        <span className="text-base font-bold text-gray-800">CASH ON HAND</span>
        <span className={`text-base font-bold ${cashOnHand >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
          {formatCurrency(cashOnHand)}
        </span>
      </div>
    </div>
  </div>
</div>

      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800"
        >
          🖨️ Print Ledger
        </button>
      </div>

      <div ref={printRef}>
        <div className="hidden print:block mb-6 text-center pb-4 border-b">
          <div className="text-lg font-bold">
            L.A. and M.J. Micro Lending Corporation
          </div>
          <div className="text-base font-semibold mt-1">
            Interest & Profit Ledger
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Printed: {new Date().toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: '2-digit'
            })}
          </div>
        </div>

        {/* Interest Ledger Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
          <div className="px-5 py-4 border-b border-gray-200">
            <span className="text-base font-bold text-gray-800">
              Interest Ledger
            </span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Loading...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Reference</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Paid</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Rate</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Interest</th>
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
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatDate(e.payment_date)}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">
                      {e.reference_no}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">
                      {e.borrower_name}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">
                      {formatCurrency(e.amount_paid)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">
                      {formatPercent(e.interest_rate)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-600">
                      {formatCurrency(e.interest_collected)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">
                      {formatCurrency(e.cumulative_interest)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-purple-50 border-t-2 border-purple-200">
                    <td colSpan={5} className="px-5 py-3 text-sm font-bold text-purple-700">
                      TOTAL INTEREST
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-700">
                      {formatCurrency(totalInterest)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-700">
                      {formatCurrency(totalInterest)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Penalty Ledger Table */}
        {penalties.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
            <div className="px-5 py-4 border-b border-gray-200">
              <span className="text-base font-bold text-gray-800">
                Penalty Ledger
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Paid</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Penalty Collected</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((p, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">
                      {p.full_name}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-600">
                      {formatCurrency(p.penalty_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-50 border-t-2 border-red-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-bold text-red-700">
                    TOTAL PENALTY COLLECTED
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-700">
                    {formatCurrency(totalPenalty)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

{/* Summary Table */}
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
  <div className="px-5 py-4 border-b border-gray-200">
    <span className="text-base font-bold text-gray-800">
      Summary
    </span>
  </div>
  <table className="w-full">
    <tbody>
      {/* NET PROFIT section */}
      <tr className="bg-gray-50">
        <td colSpan={2} className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Net Profit
        </td>
      </tr>
      <tr className="border-t border-gray-100">
        <td className="px-5 py-3 text-sm text-gray-600">
          Total Interest Earned
        </td>
        <td className="px-5 py-3 text-right text-sm font-bold text-purple-600">
          {formatCurrency(totalInterest)}
        </td>
      </tr>
      <tr className="border-t border-gray-100">
        <td className="px-5 py-3 text-sm text-gray-600">
          + Total Penalty Collected
        </td>
        <td className="px-5 py-3 text-right text-sm font-bold text-red-600">
          {formatCurrency(totalPenalty)}
        </td>
      </tr>
      <tr className="border-t-2 border-green-200 bg-green-50">
        <td className="px-5 py-3 text-sm font-bold text-green-700">
          NET PROFIT
        </td>
        <td className="px-5 py-3 text-right text-sm font-bold text-green-700">
          {formatCurrency(netProfit)}
        </td>
      </tr>

      {/* CASH ON HAND section */}
      <tr className="bg-gray-50 border-t-4 border-gray-200">
        <td colSpan={2} className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Cash on Hand
        </td>
      </tr>
      <tr className="border-t border-gray-100">
        <td className="px-5 py-3 text-sm text-gray-600">
          Total Payments Collected
        </td>
        <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
          {formatCurrency(totalCollected)}
        </td>
      </tr>
      <tr className="border-t border-gray-100">
        <td className="px-5 py-3 text-sm text-gray-600">
          − Cash Vouchers (Expenses)
        </td>
        <td className="px-5 py-3 text-right text-sm font-bold text-red-500">
          {formatCurrency(expenses)}
        </td>
      </tr>
      <tr className="border-t-2 border-blue-200 bg-blue-50">
        <td className="px-5 py-3 text-sm font-bold text-blue-700">
          CASH ON HAND
        </td>
        <td className={`px-5 py-3 text-right text-sm font-bold ${
          cashOnHand >= 0 ? 'text-blue-700' : 'text-red-600'
        }`}>
          {formatCurrency(cashOnHand)}
        </td>
      </tr>
    </tbody>
  </table>
</div>
      </div>
    </div>
  );
}