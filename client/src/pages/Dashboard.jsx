import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-base text-gray-400">
      Loading...
    </div>
  );

  const metrics = [
    { label: 'Total Loans Out', value: formatCurrency(data?.total_loans_out), sub: 'active loans', color: 'text-blue-700' },
    { label: 'Total Collected', value: formatCurrency(data?.total_collected), sub: 'this year', color: 'text-green-700' },
    { label: 'Interest Earned', value: formatCurrency(data?.interest_earned), sub: 'net of expenses', color: 'text-purple-700' },
    { label: 'Cash on Hand', value: formatCurrency(data?.cash_on_hand), sub: 'after vouchers', color: 'text-orange-600' },
  ];

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1 font-medium">{m.label}</div>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-gray-400 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Payments + Overdue */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Recent Payments */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <span className="text-base font-bold text-gray-800">Recent Payments</span>
            <button
              onClick={() => navigate('/general')}
              className="text-sm bg-white border border-gray-300 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              View General Ledger
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Type</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_payments?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No payments yet
                  </td>
                </tr>
              )}
              {data?.recent_payments?.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/borrowers/${p.borrower_id}`)}
                >
                  <td className="px-5 py-3 text-sm text-gray-600">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">{p.full_name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 capitalize">{p.payment_frequency || 'Payment'}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-green-600">+{formatCurrency(p.amount_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Overdue */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200">
            <span className="text-base font-bold text-gray-800">Overdue Accounts</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.overdue_accounts?.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No overdue accounts
                  </td>
                </tr>
              )}
              {data?.overdue_accounts?.map((o, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-100 hover:bg-red-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/borrowers/${o.loan_id}`)}
                >
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">{o.full_name}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(o.remaining_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

{/* Upcoming Payments */}
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
  <div className="px-5 py-4 border-b border-gray-200">
    <span className="text-base font-bold text-gray-800">
      Upcoming Payments
    </span>
  </div>
  <table className="w-full">
    <thead>
      <tr className="bg-gray-50">
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Due Date</th>
        <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Frequency</th>
        <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Due</th>
        <th className="px-5 py-3 text-center text-sm font-semibold text-gray-500">Days Left</th>
      </tr>
    </thead>
    <tbody>
      {data?.upcoming_payments?.length === 0 && (
        <tr>
          <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
            No upcoming payments
          </td>
        </tr>
      )}
      {data?.upcoming_payments?.map((u, i) => {
        const days = parseInt(u.days_until_due);
        const isUrgent = days <= 3 && days >= 0;
        const isOverdue = days < 0;

        return (
          <tr
            key={i}
            className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
              isOverdue ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : ''
            }`}
            onClick={() => navigate(`/borrowers/${u.borrower_id}`)}
          >
            <td className="px-5 py-3">
              <div className="text-sm font-semibold text-gray-800">{u.full_name}</div>
            </td>
            <td className="px-5 py-3 text-sm text-gray-600">{formatDate(u.due_date)}</td>
            <td className="px-5 py-3 text-sm text-gray-500 capitalize">
              {u.payment_frequency?.replace('_', '-')}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">
              {formatCurrency(u.amount_due)}
            </td>
            <td className="px-5 py-3 text-center">
              {isOverdue ? (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                  {Math.abs(days)}d overdue
                </span>
              ) : days === 0 ? (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                  Today!
                </span>
              ) : days <= 3 ? (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">
                  {days}d left ⚠
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-semibold">
                  {days}d left
                </span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
    </div>
  );
}