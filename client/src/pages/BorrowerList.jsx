import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';

export default function BorrowerList() {
  const [borrowers, setBorrowers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/borrowers')
      .then(res => setBorrowers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = borrowers.filter(b =>
    b.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.contact_number?.includes(search)
  );

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">All Borrowers</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
              <span className="text-gray-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search borrower..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent outline-none text-xs text-gray-700 w-40"
              />
            </div>
            <button
              onClick={() => navigate('/loans/new')}
              className="text-xs bg-blue-700 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-800"
            >
              + New Loan
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Loan Amount</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Remaining</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Frequency</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Rate</th>
                <th className="px-4 py-2 text-center font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    {search ? 'No borrowers found.' : 'No borrowers yet. Add a new loan to get started.'}
                  </td>
                </tr>
              )}
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/borrowers/${b.id}`)}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800">{b.full_name}</div>
                    <div className="text-gray-400">{b.contact_number}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(b.loan_amount)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-800">{formatCurrency(b.remaining_balance)}</td>
                  <td className="px-4 py-2.5 text-gray-500 capitalize">{b.payment_frequency?.replace('_', '-')}</td>
                  <td className="px-4 py-2.5 text-gray-500">{formatPercent(b.interest_rate)}</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge status={b.loan_status || 'active'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}