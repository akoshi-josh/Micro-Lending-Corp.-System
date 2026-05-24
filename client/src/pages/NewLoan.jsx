import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { computeSchedule } from '../utils/loanCalculator';

export default function NewLoan() {
  const navigate = useNavigate();
  const [borrowers, setBorrowers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isNewBorrower, setIsNewBorrower] = useState(true);

  const [form, setForm] = useState({
    // CAV info
    cav_number: '',
    release_date: new Date().toISOString().split('T')[0],
    // Personal Info
    borrower_id: '',
    full_name: '',
    age: '',
    sex: '',
    permanent_address: '',
    date_of_birth: '',
    place_of_birth: '',
    sss_id_number: '',
    co_maker: '',
    type_of_pension: '',
    civil_status: '',
    bus_address: '',
    spouse_name: '',
    spouse_dob: '',
    spouse_sss: '',
    relationship_to_borrower: '',
    bank: '',
    acct_number: '',
    pin: '',
    contact_number: '',
    id_type: '',
    id_number: '',
    // Loan Info
    loan_amount: '',
    less_charge: '',
    interest_rate: '5',
    payment_frequency: 'monthly',
    term_months: '6',
    purpose: '',
    amortization_no: '',
    amortization_mode: '',
    matured: '',
    start_date: '',
    // Signatures
    recommended_by: '',
    approved_by: '',
    verified_by: '',
    entered_by: '',
    prepared_by: '',
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
    }
  }, [form.loan_amount, form.interest_rate, form.payment_frequency, form.term_months]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.full_name && isNewBorrower) e.full_name = 'Name is required';
    if (!form.borrower_id && !isNewBorrower) e.borrower_id = 'Select a borrower';
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
      let borrower_id = form.borrower_id;

      if (isNewBorrower) {
        const b = await api.post('/api/borrowers', {
          full_name: form.full_name,
          contact_number: form.contact_number,
          address: form.permanent_address,
          id_type: form.id_type,
          id_number: form.id_number,
        });
        borrower_id = b.data.id;
      }

      await api.post('/api/loans', {
        borrower_id,
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

  const netProceeds = (parseFloat(form.loan_amount) || 0) - (parseFloat(form.less_charge) || 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm text-center">
        <div className="text-lg font-bold text-gray-800">L.A. and M.J. Micro Lending Corporation</div>
        <div className="text-sm text-gray-500">APPLICATION FORM / LOAN VOUCHER</div>
        <div className="flex justify-between mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">CAV #:</span>
            <input className="border-b border-gray-400 outline-none w-32 text-sm px-1"
              value={form.cav_number} onChange={e => set('cav_number', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Date:</span>
            <input type="date" className="border-b border-gray-400 outline-none text-sm px-1"
              value={form.release_date} onChange={e => set('release_date', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Borrower Toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setIsNewBorrower(true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${isNewBorrower ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            New Borrower
          </button>
          <button
            onClick={() => setIsNewBorrower(false)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${!isNewBorrower ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            Existing Borrower
          </button>
        </div>

        {!isNewBorrower && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Select Borrower</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.borrower_id}
              onChange={e => set('borrower_id', e.target.value)}
            >
              <option value="">-- Select Borrower --</option>
              {borrowers.map(b => (
                <option key={b.id} value={b.id}>{b.full_name}</option>
              ))}
            </select>
            {errors.borrower_id && <p className="text-red-500 text-xs mt-1">{errors.borrower_id}</p>}
          </div>
        )}
      </div>

      {/* Personal Information */}
      {isNewBorrower && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
          <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
            Personal Information
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="Full Name" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tel. #</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.contact_number} onChange={e => set('contact_number', e.target.value)}
                placeholder="Contact Number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Age</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.age} onChange={e => set('age', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sex</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Civil Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.civil_status} onChange={e => set('civil_status', e.target.value)}>
                <option value="">Select</option>
                <option>Single</option>
                <option>Married</option>
                <option>Widowed</option>
                <option>Separated</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Permanent Re. Address</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.permanent_address} onChange={e => set('permanent_address', e.target.value)}
                placeholder="Permanent Address" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bus. Address</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.bus_address} onChange={e => set('bus_address', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date of Birth</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Place of Birth</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">SSS ID No.</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.sss_id_number} onChange={e => set('sss_id_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Name of Spouse</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.spouse_name} onChange={e => set('spouse_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Spouse Date of Birth</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.spouse_dob} onChange={e => set('spouse_dob', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Spouse SSS ID No.</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.spouse_sss} onChange={e => set('spouse_sss', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Co-Maker</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.co_maker} onChange={e => set('co_maker', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Relationship to Borrower</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.relationship_to_borrower} onChange={e => set('relationship_to_borrower', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type of Pension/Salary</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.type_of_pension} onChange={e => set('type_of_pension', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bank</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.bank} onChange={e => set('bank', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Acct. No.</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.acct_number} onChange={e => set('acct_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">PIN #</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.pin} onChange={e => set('pin', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ID Type</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.id_type} onChange={e => set('id_type', e.target.value)}
                placeholder="e.g. PhilSys, Driver's License" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ID Number</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.id_number} onChange={e => set('id_number', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Loan Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Loan Details
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amount Applied (₱)</label>
            <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.loan_amount} onChange={e => set('loan_amount', e.target.value)}
              placeholder="0.00" />
            {errors.loan_amount && <p className="text-red-500 text-xs mt-1">{errors.loan_amount}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Less Charge (₱)</label>
            <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.less_charge} onChange={e => set('less_charge', e.target.value)}
              placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Net Proceeds (₱)</label>
            <input readOnly className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-700"
              value={netProceeds.toFixed(2)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Interest Rate (%)</label>
            <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} />
            {errors.interest_rate && <p className="text-red-500 text-xs mt-1">{errors.interest_rate}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Term (Months)</label>
            <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.term_months} onChange={e => set('term_months', e.target.value)} />
            {errors.term_months && <p className="text-red-500 text-xs mt-1">{errors.term_months}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Frequency</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.payment_frequency} onChange={e => set('payment_frequency', e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="semi_monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amortization No.</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.amortization_no} onChange={e => set('amortization_no', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Mode</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.amortization_mode} onChange={e => set('amortization_mode', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Matured</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.matured} onChange={e => set('matured', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.purpose} onChange={e => set('purpose', e.target.value)}
              placeholder="Purpose of loan" />
          </div>
        </div>

        {/* Live Calculator */}
        {schedule && (
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm font-bold text-blue-700 mb-3">📊 Payment Schedule Preview</div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Monthly Total</div>
                <div className="text-base font-bold text-blue-700">{formatCurrency(schedule.monthlyPayment)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Per Period</div>
                <div className="text-base font-bold text-green-700">{formatCurrency(schedule.perPeriod)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Total Interest</div>
                <div className="text-base font-bold text-purple-700">{formatCurrency(schedule.totalInterest)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100 text-center">
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className="text-base font-bold text-gray-800">{formatCurrency(schedule.totalAmount)}</div>
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
                    <tr key={i} className="border-t border-blue-100">
                      <td className="px-3 py-1.5 text-gray-600">{s.label}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-800">{formatCurrency(s.amount_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Signatures & Approval
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Prepared by</label>
            <input className="w-full border-b border-gray-300 outline-none py-1.5 text-sm"
              value={form.prepared_by} onChange={e => set('prepared_by', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Verified by</label>
            <input className="w-full border-b border-gray-300 outline-none py-1.5 text-sm"
              value={form.verified_by} onChange={e => set('verified_by', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Entered by</label>
            <input className="w-full border-b border-gray-300 outline-none py-1.5 text-sm"
              value={form.entered_by} onChange={e => set('entered_by', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Recommended for Approval</label>
            <input className="w-full border-b border-gray-300 outline-none py-1.5 text-sm"
              value={form.recommended_by} onChange={e => set('recommended_by', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Approved by</label>
            <input className="w-full border-b border-gray-300 outline-none py-1.5 text-sm"
              value={form.approved_by} onChange={e => set('approved_by', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Actions */}
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