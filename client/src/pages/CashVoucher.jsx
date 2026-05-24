import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function CashVoucher() {
  const [vouchers, setVouchers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const printRef = useRef();

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    rc_no: '',
    voucher_date: today,
    place: '',
    payable_to: '',
    address: '',
    category_id: '',
    description: '',
    amount: '',
    approved_by: '',
    received_from: 'MicroLend Lending Corporation',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchVouchers();
    api.get('/api/expenses/categories').then(res => setCategories(res.data));
  }, []);

  const fetchVouchers = () => {
    api.get('/api/vouchers').then(res => setVouchers(res.data));
  };

  const set = (f, v) => setForm(x => ({ ...x, [f]: v }));

  // Auto-generate RC No
  useEffect(() => {
    const next = `CV-${String(vouchers.length + 1).padStart(4, '0')}`;
    setForm(f => ({ ...f, rc_no: next }));
  }, [vouchers.length]);

  const validate = () => {
    const e = {};
    if (!form.payable_to) e.payable_to = 'Required';
    if (!form.amount) e.amount = 'Required';
    if (!form.voucher_date) e.voucher_date = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/api/vouchers', {
        voucher_number: form.rc_no,
        payable_to: form.payable_to,
        category_id: form.category_id || null,
        description: form.description,
        amount: form.amount,
        voucher_date: form.voucher_date,
        approved_by: form.approved_by,
      });
      fetchVouchers();
      setForm(f => ({ ...f, payable_to: '', address: '', description: '', amount: '', approved_by: '', place: '' }));
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving voucher');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Cash Voucher - ${selectedVoucher?.voucher_number || ''}`,
  });

  const printVoucher = (v) => {
    setSelectedVoucher(v);
    setTimeout(() => handlePrint(), 200);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            🧾 New Cash Voucher
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">R.C. No.</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-gray-50 font-bold text-blue-700"
                value={form.rc_no} readOnly />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={form.voucher_date} onChange={e => set('voucher_date', e.target.value)} />
              {errors.voucher_date && <p className="text-red-500 text-xs mt-1">{errors.voucher_date}</p>}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Place</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={form.place} onChange={e => set('place', e.target.value)} placeholder="Place" />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Paid to</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={form.payable_to} onChange={e => set('payable_to', e.target.value)} placeholder="Name of payee" />
            {errors.payable_to && <p className="text-red-500 text-xs mt-1">{errors.payable_to}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={form.address} onChange={e => set('address', e.target.value)} placeholder="Address" />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Particulars / Description</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Office Supplies" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₱)</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Approved by</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={form.approved_by} onChange={e => set('approved_by', e.target.value)} placeholder="Approver name" />
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Voucher ↗'}
          </button>
        </div>

        {/* Voucher Preview */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Preview
          </div>
          <div className="border-2 border-gray-800 p-5 font-mono text-sm">
            <div className="text-center text-xl font-bold mb-1 tracking-widest">CASH VOUCHER</div>
            <div className="flex justify-between text-xs mb-4">
              <div>
                <div>R.C. No.: <span className="font-bold">{form.rc_no}</span></div>
                <div>Date: <span className="font-bold">{form.voucher_date}</span></div>
                <div>Place: <span className="font-bold">{form.place || '___________'}</span></div>
              </div>
              <div className="text-right">
                <div>No. ________</div>
                <div>Date ________</div>
              </div>
            </div>

            <div className="mb-3">
              <div>Paid to: <span className="font-bold border-b border-gray-800 inline-block min-w-32">{form.payable_to || '________________________'}</span></div>
              <div className="mt-1">Address: <span className="border-b border-gray-800 inline-block min-w-48">{form.address || '________________________'}</span></div>
            </div>

            <table className="w-full border border-gray-800 mb-3 text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="border-r border-gray-800 px-2 py-1 text-left">PARTICULARS</th>
                  <th className="px-2 py-1 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="border-r border-gray-800 px-2 py-4">{form.description || ''}</td>
                  <td className="px-2 py-4 text-right">{form.amount ? formatCurrency(form.amount) : ''}</td>
                </tr>
                <tr>
                  <td className="border-r border-gray-800 px-2 py-1 font-bold">Total Php</td>
                  <td className="px-2 py-1 text-right font-bold">{form.amount ? formatCurrency(form.amount) : ''}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs mb-4">
              <div>Received from <span className="font-bold">{form.received_from}</span></div>
              <div className="mt-1">PESOS <span className="border-b border-gray-800 inline-block min-w-24">{form.amount ? formatCurrency(form.amount) : '_______'}</span> (Php <span className="font-bold">{form.amount || '_____'}</span>)</div>
              <div className="mt-1 text-xs text-gray-500">in full payment of amount described above.</div>
            </div>

            <div className="flex justify-between text-xs mt-6">
              <div className="text-center">
                <div className="border-t border-gray-800 mt-6 pt-1 min-w-28">By:</div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-800 mt-6 pt-1 min-w-28">Approved: {form.approved_by}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print version */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="p-8 font-mono text-sm">
          {selectedVoucher && (
            <>
              <div className="text-center text-2xl font-bold mb-2 tracking-widest">CASH VOUCHER</div>
              <div className="flex justify-between text-sm mb-6">
                <div>
                  <div>R.C. No.: <strong>{selectedVoucher.voucher_number}</strong></div>
                  <div>Date: <strong>{formatDate(selectedVoucher.voucher_date)}</strong></div>
                </div>
              </div>
              <div className="mb-4">Paid to: <strong>{selectedVoucher.payable_to}</strong></div>
              <table className="w-full border border-black mb-4">
                <thead>
                  <tr className="border-b border-black">
                    <th className="border-r border-black px-3 py-2 text-left">PARTICULARS</th>
                    <th className="px-3 py-2 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black px-3 py-6">{selectedVoucher.description}</td>
                    <td className="px-3 py-6 text-right">{formatCurrency(selectedVoucher.amount)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black px-3 py-2 font-bold">Total Php</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(selectedVoucher.amount)}</td>
                  </tr>
                </tbody>
              </table>
              <div>Received from MicroLend Lending Corporation</div>
              <div>PESOS {formatCurrency(selectedVoucher.amount)} in full payment of amount described above.</div>
              <div className="flex justify-between mt-12">
                <div className="border-t border-black pt-1 w-40 text-center">By:</div>
                <div className="border-t border-black pt-1 w-40 text-center">Approved: {selectedVoucher.approved_by}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Voucher History */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <span className="text-base font-bold text-gray-800">Cash Voucher History</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">R.C. No.</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Date</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Paid To</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Category</th>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Description</th>
              <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount</th>
              <th className="px-5 py-3 text-center text-sm font-semibold text-gray-500">Print</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">No vouchers yet</td></tr>
            )}
            {vouchers.map(v => (
              <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-bold text-blue-700">{v.voucher_number}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{formatDate(v.voucher_date)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-800">{v.payable_to}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{v.category_name || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{v.description || '—'}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(v.amount)}</td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => printVoucher(v)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-medium text-gray-700">
                    🖨️ Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}