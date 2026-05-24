import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export default function BorrowerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [payment, setPayment] = useState({
    amount_paid: '',
    interest_collected: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get(`/api/borrowers/${id}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `MicroLend — ${data?.borrower?.full_name}`,
  });

  const handlePayment = async () => {
    setPayError('');
    if (!payment.amount_paid || !payment.payment_date) {
      setPayError('Amount and date are required.');
      return;
    }
    setPayLoading(true);
    try {
      await api.post('/api/payments', {
        loan_id: data.loans[0]?.id,
        borrower_id: id,
        amount_paid: payment.amount_paid,
        interest_collected: payment.interest_collected || 0,
        payment_date: payment.payment_date,
        notes: payment.notes,
      });
      setShowModal(false);
      setPayment({ amount_paid: '', interest_collected: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      fetchData();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Error recording payment.');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">Borrower not found.</div>
  );

  const { borrower, loans, payments, stats } = data;
  const loan = loans?.[0];
  const initials = borrower.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Compute running balance per payment
  let runningBalance = parseFloat(stats?.loan_amount || 0);
  const paymentRows = [...(payments || [])].reverse().map(p => {
    runningBalance -= parseFloat(p.amount_paid);
    return { ...p, running_balance: runningBalance };
  }).reverse();

  const progressPercent = stats?.loan_amount > 0
    ? Math.min((parseFloat(stats.total_paid) / parseFloat(stats.loan_amount)) * 100, 100)
    : 0;

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/borrowers')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 font-medium no-print"
      >
        ← Back to Borrowers
      </button>

      <div ref={printRef}>
        {/* Print Header */}
        <div className="hidden print:block mb-6 pb-4 border-b text-center">
          <div className="text-lg font-bold">L.A. and M.J. Micro Lending Corporation</div>
          <div className="text-sm text-gray-500">Borrower Account Record</div>
          <div className="text-xs text-gray-400 mt-1">Printed: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' })}</div>
        </div>

        {/* Profile Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-xl font-bold text-blue-700">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{borrower.full_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {loan?.payment_frequency?.replace('_', '-')} Payment &nbsp;·&nbsp;
                {formatPercent(loan?.interest_rate)} Interest &nbsp;·&nbsp;
                {borrower.contact_number}
              </p>
              <div className="mt-1">
                <StatusBadge status={loan?.status || 'active'} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800"
            >
              + Record Payment
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Loan Amount</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(stats?.loan_amount)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Paid</div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(stats?.total_paid)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Amount Receivable</div>
            <div className="text-xl font-bold text-orange-600">{formatCurrency(stats?.remaining_balance)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Interest Earned</div>
            <div className="text-xl font-bold text-purple-700">{formatCurrency(stats?.interest_earned)}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
            <span>Repayment Progress</span>
            <span>{progressPercent.toFixed(0)}% paid</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Paid: {formatCurrency(stats?.total_paid)}</span>
            <span>Remaining: {formatCurrency(stats?.remaining_balance)}</span>
          </div>
        </div>

        {/* Loan Info */}
        {loan && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">
              Loan Information
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-400 font-medium">Release Date</div>
                <div className="font-semibold text-gray-800">{formatDate(loan.release_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Term</div>
                <div className="font-semibold text-gray-800">{loan.term_months} months</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Frequency</div>
                <div className="font-semibold text-gray-800 capitalize">{loan.payment_frequency?.replace('_', '-')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Purpose</div>
                <div className="font-semibold text-gray-800">{loan.purpose || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200">
            <span className="text-base font-bold text-gray-800">Transaction History</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Description</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Paid</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Interest</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening entry */}
              <tr className="border-t border-gray-100 bg-blue-50">
                <td className="px-5 py-3 text-sm text-gray-600">{formatDate(loan?.release_date)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-blue-700">Loan Released</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">{formatCurrency(stats?.loan_amount)}</td>
                <td className="px-5 py-3 text-right text-sm text-gray-400">—</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">{formatCurrency(stats?.loan_amount)}</td>
              </tr>

              {paymentRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No payments recorded yet.
                  </td>
                </tr>
              )}

              {paymentRows.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-600">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{p.notes || 'Payment Received'}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-green-600">+{formatCurrency(p.amount_paid)}</td>
                  <td className="px-5 py-3 text-right text-sm text-purple-600">{formatCurrency(p.interest_collected)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">{formatCurrency(p.running_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">Record Payment</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="mb-3 text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
              <span className="font-semibold text-blue-700">{borrower.full_name}</span> —
              Remaining: <span className="font-bold text-orange-600">{formatCurrency(stats?.remaining_balance)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Payment Amount (₱)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={payment.amount_paid}
                  onChange={e => setPayment(p => ({ ...p, amount_paid: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Interest Collected (₱)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={payment.interest_collected}
                  onChange={e => setPayment(p => ({ ...p, interest_collected: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={payment.payment_date}
                  onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={payment.notes}
                  onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Weekly payment"
                />
              </div>
            </div>

            {payError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{payError}</div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={payLoading}
                className="flex-1 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-60"
              >
                {payLoading ? 'Saving...' : 'Save Payment ↗'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}