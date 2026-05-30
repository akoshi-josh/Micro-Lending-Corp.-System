import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { computeSchedule } from '../utils/loanCalculator';
import SignaturePad from '../components/SignaturePad';

// ─── Borrower Info Modal ───────────────────────────────────────────────────
function BorrowerInfoModal({ borrower, onClose, onSelect }) {
  const hasBalance =
    parseFloat(borrower.remaining_balance || 0) > 0.01 &&
    borrower.loan_status !== 'paid';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              {borrower.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h3 className="text-white font-bold text-base">{borrower.full_name}</h3>
              <p className="text-blue-200 text-xs">{borrower.contact_number || 'No contact'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Status Banner */}
        <div
          className={`px-6 py-3 flex items-center justify-between text-sm font-semibold border-b ${
            hasBalance
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          <span>
            {hasBalance ? '⚠ Has outstanding balance — cannot reloan' : '✓ Eligible for new loan'}
          </span>
          <span className={`font-bold ${hasBalance ? 'text-red-600' : 'text-green-600'}`}>
            {hasBalance
              ? `₱${parseFloat(borrower.remaining_balance).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })} remaining`
              : borrower.loan_status === 'paid'
              ? 'Fully Paid'
              : 'No active loan'}
          </span>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Age', value: borrower.age },
              { label: 'Sex', value: borrower.sex },
              { label: 'Civil Status', value: borrower.civil_status },
              { label: 'Date of Birth', value: borrower.date_of_birth ? formatDate(borrower.date_of_birth) : null },
              { label: 'SSS ID', value: borrower.sss_id_number },
              { label: 'ID Type / Number', value: borrower.id_type ? `${borrower.id_type}: ${borrower.id_number || '—'}` : null },
            ].map((row) => (
              <div key={row.label} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-400 font-medium">{row.label}</div>
                <div className="text-sm font-semibold text-gray-800">{row.value || '—'}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-400 font-medium">Permanent Address</div>
            <div className="text-sm font-semibold text-gray-800">{borrower.address || '—'}</div>
          </div>

          {borrower.bus_address && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-400 font-medium">Business Address</div>
              <div className="text-sm font-semibold text-gray-800">{borrower.bus_address}</div>
            </div>
          )}

          {borrower.co_maker && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-400 font-medium">Co-Maker</div>
              <div className="text-sm font-semibold text-gray-800">
                {borrower.co_maker}
                {borrower.relationship_to_borrower && (
                  <span className="text-gray-400 font-normal"> ({borrower.relationship_to_borrower})</span>
                )}
              </div>
            </div>
          )}

          {/* Loan Summary */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              Loan Summary
            </div>
            <div className="grid grid-cols-2 gap-px bg-gray-100">
              {[
                {
                  label: 'Loan Amount',
                  value: borrower.loan_amount
                    ? `₱${parseFloat(borrower.loan_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : '—',
                },
                {
                  label: 'Total Paid',
                  value: borrower.total_paid
                    ? `₱${parseFloat(borrower.total_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : '—',
                },
                {
                  label: 'Remaining Balance',
                  value: borrower.remaining_balance != null
                    ? `₱${parseFloat(borrower.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : '—',
                },
                {
                  label: 'Status',
                  value: borrower.loan_status
                    ? borrower.loan_status.charAt(0).toUpperCase() + borrower.loan_status.slice(1)
                    : 'None',
                },
              ].map((row) => (
                <div key={row.label} className="bg-white px-3 py-2.5">
                  <div className="text-xs text-gray-400">{row.label}</div>
                  <div
                    className={`text-sm font-bold ${
                      row.label === 'Remaining Balance' && hasBalance
                        ? 'text-red-600'
                        : row.label === 'Status' && borrower.loan_status === 'paid'
                        ? 'text-green-600'
                        : row.label === 'Status' && borrower.loan_status === 'overdue'
                        ? 'text-red-600'
                        : row.label === 'Status' && borrower.loan_status === 'active'
                        ? 'text-blue-600'
                        : 'text-gray-800'
                    }`}
                  >
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {!hasBalance ? (
            <button
              onClick={() => { onSelect(borrower.id); onClose(); }}
              className="flex-1 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors"
            >
              ✓ Select This Borrower
            </button>
          ) : (
            <div className="flex-1 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-semibold text-center cursor-not-allowed">
              Cannot Select — Has Balance
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Existing Borrower Picker ──────────────────────────────────────────────
function ExistingBorrowerPicker({ borrowers, selectedId, onSelect, error }) {
  const [search, setSearch] = useState('');
  const [viewingBorrower, setViewingBorrower] = useState(null);

  const filtered = borrowers.filter(
    (b) =>
      b.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (b.contact_number || '').includes(search)
  );

  const selected = borrowers.find((b) => String(b.id) === String(selectedId));

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-600 mb-2">
        Search Existing Borrower
      </label>

      {/* Selected borrower pill */}
      {selected && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {selected.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <div className="text-sm font-bold text-blue-800">{selected.full_name}</div>
              <div className="text-xs text-blue-500 flex items-center gap-2">
                {selected.contact_number && <span>{selected.contact_number}</span>}
                <span className="text-green-600 font-semibold">✓ Selected — Eligible</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewingBorrower(selected)}
              className="px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
            >
              👁 View Info
            </button>
            <button
              onClick={() => onSelect('')}
              className="text-blue-400 hover:text-blue-700 text-lg font-bold leading-none w-7 h-7 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Search input */}
      {!selected && (
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Type borrower name or contact number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {!selected && search && (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <div className="text-2xl mb-2">🔍</div>
              No borrowers found matching "{search}"
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {filtered.map((b) => {
                const hasBalance =
                  parseFloat(b.remaining_balance || 0) > 0.01 &&
                  b.loan_status !== 'paid';
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between px-4 py-3 transition-colors ${
                      hasBalance ? 'bg-gray-50' : 'bg-white hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          hasBalance
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {b.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-semibold truncate ${
                            hasBalance ? 'text-gray-500' : 'text-gray-800'
                          }`}
                        >
                          {b.full_name}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                          {b.contact_number && <span>{b.contact_number}</span>}
                          {hasBalance ? (
                            <span className="text-red-500 font-medium">
                              ₱
                              {parseFloat(b.remaining_balance).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                              })}{' '}
                              balance
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">✓ Eligible</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => setViewingBorrower(b)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
                      >
                        👁 View Info
                      </button>
                      {!hasBalance ? (
                        <button
                          onClick={() => { onSelect(b.id); setSearch(''); }}
                          className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
                        >
                          Select
                        </button>
                      ) : (
                        <div className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold cursor-not-allowed select-none">
                          Ineligible
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state when no search yet */}
      {!selected && !search && (
        <div className="border border-dashed border-gray-300 rounded-xl px-4 py-6 text-center text-gray-400 text-sm">
          Start typing to search for a borrower
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
      <p className="text-xs text-gray-400 mt-1.5">
        Only borrowers with zero balance are eligible for a new loan.
      </p>

      {/* Info Modal */}
      {viewingBorrower && (
        <BorrowerInfoModal
          borrower={viewingBorrower}
          onClose={() => setViewingBorrower(null)}
          onSelect={(id) => { onSelect(id); setSearch(''); }}
        />
      )}
    </div>
  );
}

// ─── Main NewLoan Component ────────────────────────────────────────────────
export default function NewLoan() {
  const navigate = useNavigate();
  const location = useLocation();
  const [borrowers, setBorrowers] = useState([]);
  const [sysSettings, setSysSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isNewBorrower, setIsNewBorrower] = useState(true);

  // Read ?borrower_id= from URL (from "New Loan" button on paid borrower profile)
  const preselectedBorrowerId = new URLSearchParams(location.search).get('borrower_id');

  const [form, setForm] = useState({
    cav_number: '',
    release_date: new Date().toISOString().split('T')[0],
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
    loan_amount: '',
    less_charge: '',
    interest_rate: '5',
    payment_frequency: 'monthly',
    term_months: '6',
    purpose: '',
    amortization_no: '',
    amortization_mode: '',
    amortization_amount: '',
    matured: '',
    start_date: '',
    received_amount: '',
    applicant_signature: '',
    recommended_by: '',
    co_maker_signature: '',
    approve: '',
    received_by: '',
    copy_received: '',
    ci_collector: '',
    manager: 'Mila J. Aranguiz',
    account_title_0: '', debit_0: '', credit_0: '',
    account_title_1: '', debit_1: '', credit_1: '',
    account_title_2: '', debit_2: '', credit_2: '',
    prepared_by: '',
    verified_by: '',
    entered_by: '',
    approved_by: '',
  });

  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    api.get('/api/borrowers').then((res) => {
      setBorrowers(res.data);
      // Pre-select borrower from URL param
      if (preselectedBorrowerId) {
        setIsNewBorrower(false);
        setForm((f) => ({ ...f, borrower_id: preselectedBorrowerId }));
      }
    });
    api.get('/api/settings').then((res) => {
      setSysSettings(res.data);
      setForm((f) => ({
        ...f,
        interest_rate: String(res.data.default_rate),
        payment_frequency: res.data.default_frequency,
      }));
    });
  }, []);

  useEffect(() => {
    if (form.loan_amount && form.interest_rate && form.payment_frequency && form.term_months) {
      const result = computeSchedule(
        form.loan_amount,
        form.interest_rate,
        form.payment_frequency,
        form.term_months
      );
      setSchedule(result);
      if (result) {
        setForm((f) => ({
          ...f,
          amortization_amount: result.perPeriod.toFixed(2),
          received_amount: result.totalAmount.toFixed(2),
        }));
      }
    }
  }, [form.loan_amount, form.interest_rate, form.payment_frequency, form.term_months]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (isNewBorrower && !form.full_name) e.full_name = 'Name is required';
    if (!isNewBorrower) {
      if (!form.borrower_id) {
        e.borrower_id = 'Select a borrower';
      } else {
        const selected = borrowers.find((b) => String(b.id) === String(form.borrower_id));
        if (
          selected &&
          parseFloat(selected.remaining_balance || 0) > 0.01 &&
          selected.loan_status !== 'paid'
        ) {
          e.borrower_id = 'This borrower still has an outstanding balance.';
        }
      }
    }
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
          age: form.age,
          sex: form.sex,
          civil_status: form.civil_status,
          date_of_birth: form.date_of_birth || null,
          place_of_birth: form.place_of_birth,
          sss_id_number: form.sss_id_number,
          spouse_name: form.spouse_name,
          spouse_dob: form.spouse_dob || null,
          spouse_sss: form.spouse_sss,
          co_maker: form.co_maker,
          relationship_to_borrower: form.relationship_to_borrower,
          type_of_pension: form.type_of_pension,
          bus_address: form.bus_address,
          bank: form.bank,
          acct_number: form.acct_number,
          pin: form.pin,
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

  const netProceeds =
    (parseFloat(form.loan_amount) || 0) - (parseFloat(form.less_charge) || 0);

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
              onChange={(e) => set('cav_number', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Date:</span>
            <input
              type="date"
              className="border-b-2 border-gray-400 outline-none text-sm px-1 py-0.5"
              value={form.release_date}
              onChange={(e) => set('release_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── BORROWER TOGGLE ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => { setIsNewBorrower(true); set('borrower_id', ''); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              isNewBorrower
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
            }`}
          >
            + New Borrower
          </button>
          <button
            onClick={() => { setIsNewBorrower(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              !isNewBorrower
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
            }`}
          >
            🔁 Existing Borrower (Reloan)
          </button>
        </div>

        {!isNewBorrower && (
          <ExistingBorrowerPicker
            borrowers={borrowers}
            selectedId={form.borrower_id}
            onSelect={(id) => set('borrower_id', id)}
            error={errors.borrower_id}
          />
        )}
      </div>

      {/* ── PERSONAL INFORMATION (new borrower only) ── */}
      {isNewBorrower && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
          <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
            Personal Information
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.full_name ? 'border-red-400' : 'border-gray-300'}`}
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="Full Name"
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tel. #</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.contact_number}
                onChange={(e) => set('contact_number', e.target.value)}
                placeholder="Contact Number"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Age</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sex</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.sex}
                onChange={(e) => set('sex', e.target.value)}
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Civil Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.civil_status}
                onChange={(e) => set('civil_status', e.target.value)}
              >
                <option value="">Select</option>
                <option>Single</option>
                <option>Married</option>
                <option>Widowed</option>
                <option>Separated</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Permanent Re. Address</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.permanent_address}
                onChange={(e) => set('permanent_address', e.target.value)}
                placeholder="Permanent Address"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bus. Address</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.bus_address}
                onChange={(e) => set('bus_address', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.date_of_birth}
                onChange={(e) => set('date_of_birth', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Place of Birth</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.place_of_birth}
                onChange={(e) => set('place_of_birth', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">SSS ID No.</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.sss_id_number}
                onChange={(e) => set('sss_id_number', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Co-Maker</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.co_maker}
                onChange={(e) => set('co_maker', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Relationship to Borrower</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.relationship_to_borrower}
                onChange={(e) => set('relationship_to_borrower', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type of Pension/Salary</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.type_of_pension}
                onChange={(e) => set('type_of_pension', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Name of Spouse</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.spouse_name}
                onChange={(e) => set('spouse_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Spouse Date of Birth</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.spouse_dob}
                onChange={(e) => set('spouse_dob', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Spouse SSS ID No.</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.spouse_sss}
                onChange={(e) => set('spouse_sss', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bank</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.bank}
                onChange={(e) => set('bank', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Acct. No.</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.acct_number}
                onChange={(e) => set('acct_number', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">PIN #</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.pin}
                onChange={(e) => set('pin', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ID Type</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.id_type}
                onChange={(e) => set('id_type', e.target.value)}
                placeholder="e.g. PhilSys, Driver's License"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ID Number</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                value={form.id_number}
                onChange={(e) => set('id_number', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── LOAN DETAILS ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
          Loan Details
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Amount Applied (₱) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.loan_amount ? 'border-red-400' : 'border-gray-300'}`}
              value={form.loan_amount}
              onChange={(e) => set('loan_amount', e.target.value)}
              placeholder="0.00"
            />
            {errors.loan_amount && <p className="text-red-500 text-xs mt-1">{errors.loan_amount}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Less Charge (₱)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.less_charge}
              onChange={(e) => set('less_charge', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Interest (₱)</label>
            <input
              readOnly
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-purple-700"
              value={schedule ? schedule.totalInterest.toFixed(2) : '0.00'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Net Proceeds (₱)</label>
            <input
              readOnly
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-700"
              value={netProceeds.toFixed(2)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Interest Rate (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.interest_rate ? 'border-red-400' : 'border-gray-300'}`}
              value={form.interest_rate}
              onChange={(e) => set('interest_rate', e.target.value)}
            />
            {errors.interest_rate && <p className="text-red-500 text-xs mt-1">{errors.interest_rate}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Term (Months) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${errors.term_months ? 'border-red-400' : 'border-gray-300'}`}
              value={form.term_months}
              onChange={(e) => set('term_months', e.target.value)}
            />
            {errors.term_months && <p className="text-red-500 text-xs mt-1">{errors.term_months}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Frequency</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.payment_frequency}
              onChange={(e) => set('payment_frequency', e.target.value)}
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
              onChange={(e) => set('purpose', e.target.value)}
              placeholder="Purpose of loan"
            />
          </div>
        </div>

        {/* Payment Schedule Preview */}
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amortization No.</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.amortization_no}
              onChange={(e) => set('amortization_no', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Mode</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.amortization_mode}
              onChange={(e) => set('amortization_mode', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₱) — per period</label>
            <input
              type="number"
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm font-bold text-green-700 outline-none"
              value={form.amortization_amount}
              onChange={(e) => set('amortization_amount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Matured</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.matured}
              onChange={(e) => set('matured', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
            />
          </div>
        </div>

        {/* Receipt Acknowledgment */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
          <div className="text-sm font-bold text-gray-700 mb-3">Receipt Acknowledgment</div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Received the amount of (₱)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-700 outline-none focus:border-blue-500 bg-white"
              value={form.received_amount}
              onChange={(e) => set('received_amount', e.target.value)}
              placeholder="Total amount received by borrower"
            />
            <p className="text-xs text-gray-400 mt-1 italic">In full payment of amount described above.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <SignaturePad
              label="Signature (Applicant)"
              value={form.applicant_signature}
              onChange={(v) => set('applicant_signature', v)}
            />
            <SignaturePad
              label="Recommended for Approval"
              value={form.recommended_by}
              onChange={(v) => set('recommended_by', v)}
            />
            <SignaturePad
              label="Co-Maker"
              value={form.co_maker_signature}
              onChange={(v) => set('co_maker_signature', v)}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Manager</label>
              <input
                className="w-full border-b-2 border-gray-400 outline-none py-2 text-sm bg-transparent font-semibold"
                value={form.manager}
                onChange={(e) => set('manager', e.target.value)}
              />
            </div>
            <SignaturePad
              label="Approve"
              value={form.approve}
              onChange={(v) => set('approve', v)}
            />
            <SignaturePad
              label="Received by"
              value={form.received_by}
              onChange={(v) => set('received_by', v)}
            />
            <SignaturePad
              label="Copy Received"
              value={form.copy_received}
              onChange={(v) => set('copy_received', v)}
            />
            <SignaturePad
              label="C.I. / Collector"
              value={form.ci_collector}
              onChange={(v) => set('ci_collector', v)}
            />
          </div>
        </div>

        {/* DEBIT / CREDIT Table */}
        <div className="mb-5">
          <div className="text-sm font-bold text-gray-700 mb-3">Account Entry (DEBIT / CREDIT)</div>
          <table className="w-full border border-gray-300 rounded-lg overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2.5 text-left font-semibold text-gray-600">ACCOUNT TITLE</th>
                <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold text-gray-600 w-36">DEBIT</th>
                <th className="border border-gray-300 px-4 py-2.5 text-center font-semibold text-gray-600 w-36">CREDIT</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">
                    <input
                      className="w-full outline-none text-sm py-1.5 px-1"
                      placeholder="Account title"
                      value={form[`account_title_${i}`] || ''}
                      onChange={(e) => set(`account_title_${i}`, e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    <input
                      type="number"
                      className="w-full outline-none text-sm py-1.5 px-1 text-right"
                      placeholder="0.00"
                      value={form[`debit_${i}`] || ''}
                      onChange={(e) => set(`debit_${i}`, e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    <input
                      type="number"
                      className="w-full outline-none text-sm py-1.5 px-1 text-right"
                      placeholder="0.00"
                      value={form[`credit_${i}`] || ''}
                      onChange={(e) => set(`credit_${i}`, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final Signatures */}
        <div>
          <div className="text-sm font-bold text-gray-700 mb-3">Signatures</div>
          <div className="grid grid-cols-4 gap-4">
            <SignaturePad
              label="Prepared by"
              value={form.prepared_by}
              onChange={(v) => set('prepared_by', v)}
            />
            <SignaturePad
              label="Verified by"
              value={form.verified_by}
              onChange={(v) => set('verified_by', v)}
            />
            <SignaturePad
              label="Entered by"
              value={form.entered_by}
              onChange={(v) => set('entered_by', v)}
            />
            <SignaturePad
              label="Approved by"
              value={form.approved_by}
              onChange={(v) => set('approved_by', v)}
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
          className="px-8 py-3 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-60 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Loan ↗'
          )}
        </button>
      </div>
    </div>
  );
}