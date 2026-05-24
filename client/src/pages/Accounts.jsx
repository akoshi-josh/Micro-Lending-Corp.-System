import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';

const TABS = ['Cash on Hand', 'Cash in Bank', 'Accounts Receivable', 'Salary & Expenses'];

export default function Accounts() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankEntries, setBankEntries] = useState([]);
  const [bankForm, setBankForm] = useState({ description: '', amount: '', type: 'deposit', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    api.get('/api/ledger/accounts')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cashIn = parseFloat(data?.cash_on_hand?.total_in || 0);
  const cashOut = parseFloat(data?.cash_on_hand?.total_out || 0);
  const cashOnHand = cashIn - cashOut;

  const bankBalance = bankEntries.reduce((sum, e) =>
    e.type === 'deposit' ? sum + parseFloat(e.amount) : sum - parseFloat(e.amount), 0);

  const addBankEntry = () => {
    if (!bankForm.description || !bankForm.amount) return;
    setBankEntries(prev => [...prev, { ...bankForm, id: Date.now() }]);
    setBankForm({ description: '', amount: '', type: 'deposit', date: new Date().toISOString().split('T')[0] });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>;

  return (
    <div>
      {/* Tab Group */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === i ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cash on Hand */}
      {tab === 0 && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 font-medium mb-1">Total Payments Received</div>
              <div className="text-xl font-bold text-green-700">{formatCurrency(cashIn)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 font-medium mb-1">Total Expenses (Vouchers)</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(cashOut)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 font-medium mb-1">Cash on Hand</div>
              <div className={`text-xl font-bold ${cashOnHand >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {formatCurrency(cashOnHand)}
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3">Cash on Hand Formula</div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <div className="flex justify-between mb-2">
                <span>Total Payments Received (Debit)</span>
                <span className="font-bold text-green-700">{formatCurrency(cashIn)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Less: Total Cash Vouchers (Credit)</span>
                <span className="font-bold text-red-600">- {formatCurrency(cashOut)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                <span className="font-bold">Cash on Hand</span>
                <span className="font-bold text-blue-700">{formatCurrency(cashOnHand)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash in Bank */}
      {tab === 1 && (
        <div>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="text-base font-bold text-gray-800 mb-4">Add Bank Transaction</div>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={bankForm.date} onChange={e => setBankForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={bankForm.description} onChange={e => setBankForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Bank deposit" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={bankForm.type} onChange={e => setBankForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₱)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={bankForm.amount} onChange={e => setBankForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
              </div>
              <button onClick={addBankEntry}
                className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">
                + Add Entry
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">Cash in Bank</span>
                <span className={`text-lg font-bold ${bankBalance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  Balance: {formatCurrency(bankBalance)}
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Description</th>
                    <th className="px-5 py-3 text-right text-sm font-semibold text-green-600">Deposit</th>
                    <th className="px-5 py-3 text-right text-sm font-semibold text-red-500">Withdrawal</th>
                  </tr>
                </thead>
                <tbody>
                  {bankEntries.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No bank entries yet.</td></tr>
                  )}
                  {bankEntries.map(e => (
                    <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-600">{e.date}</td>
                      <td className="px-5 py-3 text-sm text-gray-800">{e.description}</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                        {e.type === 'deposit' ? formatCurrency(e.amount) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-red-500">
                        {e.type === 'withdrawal' ? formatCurrency(e.amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Receivable */}
      {tab === 2 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200">
            <span className="text-base font-bold text-gray-800">Accounts Receivable — Outstanding Balances</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Borrower</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Loan Amount</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Total Paid</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Outstanding Balance</th>
                <th className="px-5 py-3 text-center text-sm font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!data?.receivables || data.receivables.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No outstanding receivables.</td></tr>
              )}
              {data?.receivables?.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">{r.full_name}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">{formatCurrency(r.loan_amount)}</td>
                  <td className="px-5 py-3 text-right text-sm text-green-600 font-semibold">{formatCurrency(r.total_paid)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-orange-600">{formatCurrency(r.outstanding)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${r.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data?.receivables?.length > 0 && (
                <tr className="bg-orange-50 border-t-2 border-orange-200">
                  <td className="px-5 py-3 text-sm font-bold text-orange-700">TOTAL RECEIVABLE</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-700">
                    {formatCurrency(data.receivables.reduce((s, r) => s + parseFloat(r.loan_amount || 0), 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-green-700">
                    {formatCurrency(data.receivables.reduce((s, r) => s + parseFloat(r.total_paid || 0), 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-orange-600">
                    {formatCurrency(data.receivables.reduce((s, r) => s + parseFloat(r.outstanding || 0), 0))}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary & Expenses */}
      {tab === 3 && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {data?.expenses?.map((e, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500 font-medium mb-1">{e.category}</div>
                <div className="text-xl font-bold text-red-600">{formatCurrency(e.total)}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <span className="text-base font-bold text-gray-800">Expenses by Category</span>
              <span className="text-lg font-bold text-red-600">
                Total: {formatCurrency(data?.expenses?.reduce((s, e) => s + parseFloat(e.total || 0), 0))}
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Category</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {data?.expenses?.map((e, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{e.category}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(e.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}