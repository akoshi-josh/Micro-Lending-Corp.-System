import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { computeSchedule } from '../utils/loanCalculator';
import SignaturePad from '../components/SignaturePad';

export default function ExistingLoan() {
  const navigate = useNavigate();
  const [borrowers, setBorrowers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    // CAV info
    cav_number: '',
    release_date: new Date().toISOString().split('T')[0],
    // Borrower selection
    borrower_id: '',
    // Loan Info
    loan_amount: '',
    less_charge: '',
    interest_rate: '5',
    payment_frequency: 'monthly',
    term_months: '6',
    purpose: '',
    // Amortization
    amortization_no: '',
    amortization_mode: '',
    amortization_amount: '',
    matured: '',
    start_date: '',
    // Receipt
    received_amount: '',
    applicant_signature: '',
    recommended_by: '',
    co_maker_signature: '',
    approve: '',
    received_by: '',
    copy_received: '',
    ci_collector: '',
    manager: 'Mila J. Aranguiz',
    // Account entries
    account_title_0: '', debit_0: '', credit_0: '',
    account_title_1: '', debit_1: '', credit_1: '',
    account_title_2: '', debit_2: '', credit_2: '',
    // Signatures
    prepared_by: '',
    verified_by: '',
    entered_by: '',
    approved_by: '',
  });

  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    api.get('/api/borrowers').then(res => setBorrowers(res.data));
  }, []);

  useEffect(() => {
    if (form.loan_amount && form.interest_rate && form.payment_frequency && form.term_months) {
      const result = computeSchedule(
        form.loan_amount, form.interest_rate,
        form.payment_frequency, form.term_months
      );
      setSchedule(result);
      if (result) {
        setForm(f => ({
          ...f,
          amortization_amount: result.perPeriod.toFixed(2),
          received_amount: result.totalAmount.toFixed(2),
        }));
      }
    }
  }, [form.loan_amount, form.interest_rate, form.payment_frequency, form.term_months]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.borrower_id) e.borrower_id = 'Please select a borrower';
    if (!form.loan_amount) e.loan_amount = 'Loan amount is required';
    if (!form.interest_rate) e.interest_rate = 'Interest rate is required';
    if (!form.term_months) e.term_months = 'Term is required';
    if (!form.release_date) e.release_date = 'Release date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/api/loans', {
        borrower_id: form.borrower_id,
        loan_amount: form.loan_amount,
        interest_rate: form.interest_rate,
        payment_frequency: form.payment_frequency,
        term_months: form.term_months,
        release_date: form.release_date,
        purpose: form.purpose,
      });

      navigate('/borrowers');
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating loan');
    } finally {
      setLoading(false);
    }
  };

  const netProceeds = (parseFloat(form.loan_amount) || 0) -
    (parseFloat(form.less_charge) || 0);

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── HEADER ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm text-center">
        <div className="text-lg font-bold text-gray-800">
          L.A. and M.J. Micro Lending Corporation
        </div>
        <div className="text-sm text-gray-500 mt-0.5">
          P-5, Pob 1 (Agay), R.T. Romualdez · Tel No.
        </div>
        <div className="text-base font-bold text-gray-700 mt-1">
          APPLICATION FORM / LOAN VOUCHER
        </div>
        <div className="flex justify-between mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">CAV #:</span>
            <input
              className="border-b-2 border-gray-400 outline-none w-32 text-sm px-1 py-0.5"
              value={form.cav_number}
              onChange={e => set('cav_number', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Date:</span>
            <input
              type="date"
              className="border-b-2 border-gray-400 outline-none text-sm px-1 py-0.5"
              value={form.release_date}
              onChange={e => set('release_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── BORROWER SELECTION ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Select Borrower
        </div>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          value={form.borrower_id}
          onChange={e => set('borrower_id', e.target.value)}
        >
          <option value="">-- Select Existing Borrower --</option>
          {borrowers.map(b => (
            <option key={b.id} value={b.id}>{b.full_name}</option>
          ))}
        </select>
        {errors.borrower_id && (
          <p className="text-red-500 text-xs mt-1">{errors.borrower_id}</p>
        )}
      </div>

      {/* ── LOAN DETAILS ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Loan Details
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Amount Applied (₱)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.loan_amount}
              onChange={e => set('loan_amount', e.target.value)}
              placeholder="0.00"
            />
            {errors.loan_amount && (
              <p className="text-red-500 text-xs mt-1">{errors.loan_amount}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Less Charge (₱)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.less_charge}
              onChange={e => set('less_charge', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Interest (₱)
            </label>
            <input
              readOnly
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-purple-700"
              value={schedule ? schedule.totalInterest.toFixed(2) : '0.00'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Net Proceeds (₱)
            </label>
            <input
              readOnly
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-700"
              value={netProceeds.toFixed(2)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Interest Rate (%)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.interest_rate}
              onChange={e => set('interest_rate', e.target.value)}
            />
            {errors.interest_rate && (
              <p className="text-red-500 text-xs mt-1">{errors.interest_rate}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Term (Months)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.term_months}
              onChange={e => set('term_months', e.target.value)}
            />
            {errors.term_months && (
              <p className="text-red-500 text-xs mt-1">{errors.term_months}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Payment Frequency
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.payment_frequency}
              onChange={e => set('payment_frequency', e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="semi_monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.purpose}
              onChange={e => set('purpose', e.target.value)}
              placeholder="Purpose of loan"
            />
          </div>
        </div>

        {/* Payment Schedule Preview */}
        {schedule && (
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm font-bold text-blue-700 mb-3">
              📊 Payment Schedule Preview
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Monthly Total</div>
                <div className="text-base font-bold text-blue-700">
                  {formatCurrency(schedule.monthlyPayment)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Per Period</div>
                <div className="text-base font-bold text-green-700">
                  {formatCurrency(schedule.perPeriod)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Total Interest</div>
                <div className="text-base font-bold text-purple-700">
                  {formatCurrency(schedule.totalInterest)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className="text-base font-bold text-gray-800">
                  {formatCurrency(schedule.totalAmount)}
                </div>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-blue-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-blue-700">Period</th>
                    <th className="px-3 py-2 text-right font-semibold text-blue-700">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.schedule.map((s, i) => (
                    <tr key={i} className={`border-t border-blue-100 ${i === schedule.schedule.length - 1 ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-1.5 text-gray-600">
                        {s.label}
                        {i === schedule.schedule.length - 1 && (
                          <span className="ml-2 text-xs text-yellow-600 font-semibold">(adjusted)</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                        {formatCurrency(s.amount_due)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── AMORTIZATION & RECEIPT ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Amortization & Receipt
        </div>

        <div className="grid grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Amortization No.
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.amortization_no}
              onChange={e => set('amortization_no', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Mode</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.amortization_mode}
              onChange={e => set('amortization_mode', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Amount (₱) — per period
            </label>
            <input
              type="number"
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-green-700 outline-none"
              value={form.amortization_amount}
              onChange={e => set('amortization_amount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Matured</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.matured}
              onChange={e => set('matured', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
            />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
          <div className="text-sm font-bold text-gray-700 mb-3">Receipt Acknowledgment</div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Received the amount of (₱)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-700 outline-none focus:border-blue-500 bg-white"
              value={form.received_amount}
              onChange={e => set('received_amount', e.target.value)}
              placeholder="Total amount received by borrower"
            />
            <p className="text-xs text-gray-400 mt-1 italic">
              In full payment of amount described above.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <SignaturePad
              label="Signature (Applicant)"
              value={form.applicant_signature}
              onChange={v => set('applicant_signature', v)}
            />
            <SignaturePad
              label="Recommended for Approval"
              value={form.recommended_by}
              onChange={v => set('recommended_by', v)}
            />
            <SignaturePad
              label="Co-Maker"
              value={form.co_maker_signature}
              onChange={v => set('co_maker_signature', v)}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Manager</label>
              <input
                className="w-full border-b-2 border-gray-400 outline-none py-2 text-sm bg-transparent font-semibold"
                value={form.manager}
                onChange={e => set('manager', e.target.value)}
              />
            </div>
            <SignaturePad
              label="Approve"
              value={form.approve}
              onChange={v => set('approve', v)}
            />
            <SignaturePad
              label="Received by"
              value={form.received_by}
              onChange={v => set('received_by', v)}
            />
            <SignaturePad
              label="Copy Received"
              value={form.copy_received}
              onChange={v => set('copy_received', v)}
            />
            <SignaturePad
              label="C.I. / Collector"
              value={form.ci_collector}
              onChange={v => set('ci_collector', v)}
            />
          </div>
        </div>

        <div className="mb-5">
          <div className="text-sm font-bold text-gray-700 mb-3">
            Account Entry (DEBIT / CREDIT)
          </div>
          <table className="w-full border border-gray-300 rounded-lg overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2.5 text-left font-semibold text-gray-600">
                  ACCOUNT TITLE
                </th>
                <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold text-gray-600 w-36">
                  DEBIT
                </th>
                <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold text-gray-600 w-36">
                  CREDIT
                </th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map(i => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">
                    <input
                      className="w-full outline-none text-sm py-1.5 px-1"
                      placeholder="Account title"
                      value={form[`account_title_${i}`] || ''}
                      onChange={e => set(`account_title_${i}`, e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    <input
                      type="number"
                      className="w-full outline-none text-sm py-1.5 px-1 text-right"
                      placeholder="0.00"
                      value={form[`debit_${i}`] || ''}
                      onChange={e => set(`debit_${i}`, e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    <input
                      type="number"
                      className="w-full outline-none text-sm py-1.5 px-1 text-right"
                      placeholder="0.00"
                      value={form[`credit_${i}`] || ''}
                      onChange={e => set(`credit_${i}`, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="text-sm font-bold text-gray-700 mb-3">Signatures</div>
          <div className="grid grid-cols-4 gap-4">
            <SignaturePad
              label="Prepared by"
              value={form.prepared_by}
              onChange={v => set('prepared_by', v)}
            />
            <SignaturePad
              label="Verified by"
              value={form.verified_by}
              onChange={v => set('verified_by', v)}
            />
            <SignaturePad
              label="Entered by"
              value={form.entered_by}
              onChange={v => set('entered_by', v)}
            />
            <SignaturePad
              label="Approved by"
              value={form.approved_by}
              onChange={v => set('approved_by', v)}
            />
          </div>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="flex justify-end gap-3 mb-8">
        <button
          onClick={() => navigate('/borrowers')}
          className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-3 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Loan ↗'}
        </button>
      </div>
    </div>
  );
}