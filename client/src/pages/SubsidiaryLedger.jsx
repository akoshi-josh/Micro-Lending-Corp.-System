import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export default function SubsidiaryLedger() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const printRef = useRef();

  useEffect(() => {
    api.get('/api/ledger/subsidiary')
      .then(res => setRecords(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── FIX: use contentRef instead of content() ──
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'MicroLend — Subsidiary Ledger',
  });

  const filtered = records.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filtered.reduce((acc, r) => ({
    loan_amount: acc.loan_amount + parseFloat(r.loan_amount || 0),
    total_paid: acc.total_paid + parseFloat(r.total_paid || 0),
    remaining: acc.remaining + parseFloat(r.remaining_balance || 0),
    interest: acc.interest + parseFloat(r.interest_earned || 0),
  }), { loan_amount: 0, total_paid: 0, remaining: 0, interest: 0 });

  return (
    <div>
      <div className="flex justify-between items-center mb-4 no-print">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search borrower..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="outline-none text-sm text-gray-700 w-52"
          />
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
          <div className="text-base font-semibold mt-1">Subsidiary Ledger</div>
          <div className="text-xs text-gray-400 mt-1">Printed: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' })}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 no-print">
            <span className="text-base font-bold text-gray-800">Subsidiary Ledger — All Borrower Accounts</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Loan Amount</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Paid</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Receivable</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Interest Earned</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Progress</th>
                  <th className="px-5 py-3 text-center text-sm font-semibold text-gray-500">Status</th>
                  <th className="px-5 py-3 text-center text-sm font-semibold text-gray-500 no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No records found.
                    </td>
                  </tr>
                )}
                {filtered.map((r, i) => {
                  const percent = r.loan_amount > 0
                    ? Math.min((parseFloat(r.total_paid) / parseFloat(r.loan_amount)) * 100, 100)
                    : 0;
                  return (
                    <tr key={i} className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/borrowers/${r.borrower_id}`)}>
                      <td className="px-5 py-3">
                        <div className="text-sm font-semibold text-gray-800">{r.full_name}</div>
                        <div className="text-xs text-gray-400 capitalize">{r.payment_frequency?.replace('_', '-')} · {formatPercent(r.interest_rate)}</div>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-gray-700">{formatCurrency(r.loan_amount)}</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-green-600">{formatCurrency(r.total_paid)}</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-orange-600">{formatCurrency(r.remaining_balance)}</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-purple-600">{formatCurrency(r.interest_earned)}</td>
                      <td className="px-5 py-3 w-36">
                        <div className="text-xs text-gray-400 mb-1">{percent.toFixed(0)}%</div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={r.status || 'active'} />
                      </td>
                      <td className="px-5 py-3 text-center no-print">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/borrowers/${r.borrower_id}`); }}
                          className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded font-semibold hover:bg-blue-100"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Row */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-5 py-3 text-sm font-bold text-blue-700">TOTAL ({filtered.length} borrowers)</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">{formatCurrency(totals.loan_amount)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-green-700">{formatCurrency(totals.total_paid)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-orange-600">{formatCurrency(totals.remaining)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-purple-700">{formatCurrency(totals.interest)}</td>
                    <td colSpan={3}></td>
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