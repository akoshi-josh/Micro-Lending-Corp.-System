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
  const [showPayModal, setShowPayModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [payment, setPayment] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [photo, setPhoto] = useState(null);

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

    const amountPaid = parseFloat(payment.amount_paid);
    const remaining = parseFloat(stats?.remaining_balance || 0);

    if (amountPaid > remaining + 0.01) {
      setPayError(`Amount exceeds remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    setPayLoading(true);
    try {
      const res = await api.post('/api/payments', {
        loan_id: data.loans[0]?.id,
        borrower_id: id,
        amount_paid: payment.amount_paid,
        payment_date: payment.payment_date,
        notes: payment.notes,
      });

      setShowPayModal(false);
      setPayment({
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      if (res.data.loan_fully_paid) {
        alert('🎉 Loan fully paid! Borrower account is now closed.');
      }

      fetchData();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Error recording payment.');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDocUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedDocs(prev => [...prev, {
          name: file.name,
          type: file.type,
          url: reader.result,
          uploadedAt: new Date().toLocaleDateString()
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      Loading...
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      Borrower not found.
    </div>
  );

  const { borrower, loans, payments, stats, next_payment, schedule } = data;
  const loan = loans?.[0];
  const initials = borrower.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Running balance
  let runningBalance = parseFloat(stats?.total_payable || 0);
  const paymentRows = [...(payments || [])].reverse().map(p => {
    runningBalance -= parseFloat(p.amount_paid);
    return { ...p, running_balance: runningBalance };
  }).reverse();

  const progressPercent = stats?.total_payable > 0
    ? Math.min(
        (parseFloat(stats.total_paid) / parseFloat(stats.total_payable)) * 100,
        100
      )
    : 0;

  // Per period due
  const totalPayable = parseFloat(stats?.total_payable || 0);
  const termMonths = parseInt(stats?.term_months || 1);
  const monthlyDue = totalPayable / termMonths;

  let perPeriodDue = monthlyDue;
  let frequencyLabel = 'Monthly';
  if (loan?.payment_frequency === 'semi_monthly') {
    perPeriodDue = monthlyDue / 2;
    frequencyLabel = 'Semi-Monthly';
  } else if (loan?.payment_frequency === 'weekly') {
    perPeriodDue = monthlyDue / 4;
    frequencyLabel = 'Weekly';
  }

  // Days until next payment
  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      {/* Back */}
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
          <div className="text-xs text-gray-400 mt-1">
            Printed: {new Date().toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: '2-digit'
            })}
          </div>
        </div>

        {/* ── PROFILE HEADER ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {photo ? (
                <img src={photo} alt="borrower"
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700">
                  {initials}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-800">{borrower.full_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loan?.payment_frequency?.replace('_', '-')} Payment &nbsp;·&nbsp;
                  {formatPercent(loan?.interest_rate)} Interest &nbsp;·&nbsp;
                  {borrower.contact_number || 'No contact'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={loan?.status || 'active'} />
                  {borrower.address && (
                    <span className="text-xs text-gray-400">📍 {borrower.address}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 no-print flex-wrap justify-end">
              <button
                onClick={() => setShowInfoModal(true)}
                className="px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg text-sm font-semibold hover:bg-blue-100"
              >
                👤 View Info
              </button>
              <button
                onClick={() => setShowDocsModal(true)}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-gray-50 rounded-lg text-sm font-semibold hover:bg-gray-100"
              >
                📎 Documents
              </button>
              <button
                onClick={() => setShowPayModal(true)}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800"
              >
                + Record Payment
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Loan Amount</div>
            <div className="text-xl font-bold text-blue-700">
              {formatCurrency(stats?.loan_amount)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Principal</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Payable</div>
            <div className="text-xl font-bold text-gray-800">
              {formatCurrency(stats?.total_payable)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Principal + Interest</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Paid</div>
            <div className="text-xl font-bold text-green-700">
              {formatCurrency(stats?.total_paid)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Payments received</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Amount Receivable</div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(stats?.remaining_balance)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Still to collect</div>
          </div>
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
            <span>Repayment Progress</span>
            <span>{progressPercent.toFixed(1)}% paid</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Paid: {formatCurrency(stats?.total_paid)}</span>
            <span className="font-semibold text-blue-700">
              {frequencyLabel} Due: {formatCurrency(perPeriodDue)}
            </span>
            <span>Remaining: {formatCurrency(stats?.remaining_balance)}</span>
          </div>
        </div>

        {/* ── NEXT PAYMENT DUE ── */}
        {next_payment && loan?.status !== 'paid' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Next Payment Due</div>
                  <div className="text-lg font-bold text-gray-800">
                    {formatDate(next_payment.due_date)}
                  </div>
                  <div className="text-sm mt-0.5">
                    {(() => {
                      const days = getDaysUntilDue(next_payment.due_date);
                      if (days < 0) return (
                        <span className="text-red-500 font-semibold">
                          ⚠ Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''}
                        </span>
                      );
                      if (days === 0) return (
                        <span className="text-orange-500 font-semibold">
                          Due today!
                        </span>
                      );
                      if (days <= 3) return (
                        <span className="text-orange-500 font-semibold">
                          ⚠ Due in {days} day{days !== 1 ? 's' : ''}
                        </span>
                      );
                      return (
                        <span className="text-gray-500">
                          Due in {days} days
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 font-medium">Amount Due</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(next_payment.amount_due)}
                </div>
                <button
                  onClick={() => setShowPayModal(true)}
                  className="mt-2 text-sm bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 no-print"
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loan fully paid notice */}
        {loan?.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="text-base font-bold text-green-700">Loan Fully Paid!</div>
              <div className="text-sm text-green-600">
                This borrower has completed all payments successfully.
              </div>
            </div>
          </div>
        )}

        {/* ── LOAN INFO ── */}
        {loan && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">
              Loan Information
            </div>
            <div className="grid grid-cols-5 gap-4 text-sm">
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
                <div className="font-semibold text-gray-800 capitalize">
                  {loan.payment_frequency?.replace('_', '-')}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">{frequencyLabel} Payment</div>
                <div className="font-bold text-blue-700">{formatCurrency(perPeriodDue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Purpose</div>
                <div className="font-semibold text-gray-800">{loan.purpose || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSACTION HISTORY ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
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
                <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">
                  {formatCurrency(stats?.loan_amount)}
                </td>
                <td className="px-5 py-3 text-right text-sm text-purple-600">
                  +{formatCurrency(
                    parseFloat(stats?.loan_amount || 0) *
                    parseFloat(stats?.interest_rate || 0) / 100
                  )}
                </td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">
                  {formatCurrency(stats?.total_payable)}
                </td>
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
                  <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                    +{formatCurrency(p.amount_paid)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-purple-600">
                    {formatCurrency(p.interest_collected)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">
                    {formatCurrency(p.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── PAYMENT SCHEDULE ── */}
        {schedule && schedule.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200">
              <span className="text-base font-bold text-gray-800">Payment Schedule</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">#</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Due Date</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-500">Amount Due</th>
                  <th className="px-5 py-3 text-center text-sm font-semibold text-gray-500">Status</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-500">Days</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s, i) => {
                  const days = getDaysUntilDue(s.due_date);
                  const isNext = s.status === 'pending' &&
                    next_payment?.due_date &&
                    new Date(s.due_date).toDateString() ===
                    new Date(next_payment.due_date).toDateString();

                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-gray-100 ${
                        isNext ? 'bg-blue-50' : ''
                      } ${s.status === 'paid' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-5 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-800">
                        {formatDate(s.due_date)}
                        {isNext && (
                          <span className="ml-2 text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full">
                            Next
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">
                        {formatCurrency(s.amount_due)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          s.status === 'paid'
                            ? 'bg-green-50 text-green-700'
                            : s.status === 'overdue'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {s.status === 'paid'
                            ? '✓ Paid'
                            : s.status === 'overdue'
                            ? 'Overdue'
                            : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {s.status === 'paid' ? (
                          <span className="text-green-600 font-semibold">✓</span>
                        ) : days < 0 ? (
                          <span className="text-red-500 font-semibold">
                            {Math.abs(days)}d overdue
                          </span>
                        ) : days === 0 ? (
                          <span className="text-orange-500 font-semibold">Today!</span>
                        ) : days <= 3 ? (
                          <span className="text-orange-500 font-semibold">in {days}d ⚠</span>
                        ) : (
                          <span className="text-gray-500">in {days}d</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>{/* end printRef */}

      {/* ── BORROWER INFO MODAL ── */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl shadow-xl max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-800">👤 Borrower Information</h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Photo */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                {photo ? (
                  <img src={photo} alt="borrower"
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-3xl font-bold text-blue-700">
                    {initials}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">
                    Profile Photo (Optional)
                  </div>
                  <label className="cursor-pointer text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium">
                    📷 Upload Photo
                    <input
                      type="file" accept="image/*"
                      className="hidden" onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <div className="text-sm font-bold text-blue-700 mb-3">Personal Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Full Name" value={borrower.full_name} />
                  <InfoRow label="Age" value={borrower.age} />
                  <InfoRow label="Sex" value={borrower.sex} />
                  <InfoRow label="Civil Status" value={borrower.civil_status} />
                  <InfoRow label="Date of Birth" value={formatDate(borrower.date_of_birth)} />
                  <InfoRow label="Place of Birth" value={borrower.place_of_birth} />
                  <InfoRow label="Contact Number" value={borrower.contact_number} />
                  <InfoRow label="SSS ID No." value={borrower.sss_id_number} />
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="text-sm font-bold text-blue-700 mb-3">Address</div>
                <div className="grid grid-cols-1 gap-3">
                  <InfoRow label="Permanent Address" value={borrower.address} />
                  <InfoRow label="Business Address" value={borrower.bus_address} />
                </div>
              </div>

              {/* Spouse & Co-Maker */}
              <div>
                <div className="text-sm font-bold text-blue-700 mb-3">Spouse & Co-Maker</div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Name of Spouse" value={borrower.spouse_name} />
                  <InfoRow label="Spouse Date of Birth" value={formatDate(borrower.spouse_dob)} />
                  <InfoRow label="Spouse SSS ID" value={borrower.spouse_sss} />
                  <InfoRow label="Co-Maker" value={borrower.co_maker} />
                  <InfoRow label="Relationship to Borrower" value={borrower.relationship_to_borrower} />
                </div>
              </div>

              {/* Financial */}
              <div>
                <div className="text-sm font-bold text-blue-700 mb-3">Financial Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Type of Pension/Salary" value={borrower.type_of_pension} />
                  <InfoRow label="Bank" value={borrower.bank} />
                  <InfoRow label="Account Number" value={borrower.acct_number} />
                  <InfoRow label="ID Type" value={borrower.id_type} />
                  <InfoRow label="ID Number" value={borrower.id_number} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS MODAL ── */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">📎 Documents</h3>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >×</button>
            </div>
            <div className="p-6">
              <div className="text-sm font-semibold text-gray-700 mb-1">
                Upload Documents (Optional)
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Driver's License, SSS Card, Birth Certificate, etc.
              </div>
              <label className="cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 rounded-xl p-6 text-sm text-blue-700 hover:bg-blue-50 transition-colors mb-4">
                📁 Click to upload documents
                <input
                  type="file" multiple accept="image/*,.pdf"
                  className="hidden" onChange={handleDocUpload}
                />
              </label>

              {uploadedDocs.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-2">
                  No documents uploaded yet.
                </div>
              )}

              <div className="space-y-2">
                {uploadedDocs.map((doc, i) => (
                  <div key={i}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {doc.type.includes('pdf') ? '📄' : '🖼️'}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{doc.name}</div>
                        <div className="text-xs text-gray-400">Uploaded {doc.uploadedAt}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.type.includes('image') && (
                        <a href={doc.url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-700 hover:underline font-medium">
                          View
                        </a>
                      )}
                      <button
                        onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Record Payment</h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >×</button>
            </div>

            {/* Borrower Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="text-sm font-bold text-blue-700 mb-2">{borrower.full_name}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <div className="text-xs text-gray-400">Loan Amount</div>
                  <div className="text-sm font-bold text-gray-800">
                    {formatCurrency(stats?.loan_amount)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <div className="text-xs text-gray-400">Total Payable</div>
                  <div className="text-sm font-bold text-gray-800">
                    {formatCurrency(stats?.total_payable)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <div className="text-xs text-gray-400">Total Paid</div>
                  <div className="text-sm font-bold text-green-600">
                    {formatCurrency(stats?.total_paid)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <div className="text-xs text-gray-400">Remaining Balance</div>
                  <div className="text-sm font-bold text-orange-600">
                    {formatCurrency(stats?.remaining_balance)}
                  </div>
                </div>
              </div>

              {/* Payment due — no highlight, just simple row */}
              <div className="mt-3 border-t border-blue-100 pt-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">{frequencyLabel} Payment Due</span>
                <span className="text-base font-bold text-blue-700">
                  {formatCurrency(perPeriodDue)}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Amount Collected (₱)
                </label>
                <input
                  type="number"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${
                    parseFloat(payment.amount_paid) >
                    parseFloat(stats?.remaining_balance)
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  value={payment.amount_paid}
                  onChange={e => setPayment(p => ({ ...p, amount_paid: e.target.value }))}
                  placeholder={`Suggested: ${formatCurrency(perPeriodDue)}`}
                />
                {parseFloat(payment.amount_paid) >
                  parseFloat(stats?.remaining_balance) ? (
                  <p className="text-xs text-red-500 mt-1 font-semibold">
                    ⚠ Amount exceeds remaining balance of{' '}
                    {formatCurrency(stats?.remaining_balance)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    Interest is already included in the payment amount.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={payment.payment_date}
                  onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  value={payment.notes}
                  onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Week 1 payment"
                />
              </div>
            </div>

            {payError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {payError}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={
                  payLoading ||
                  !payment.amount_paid ||
                  parseFloat(payment.amount_paid) <= 0 ||
                  parseFloat(payment.amount_paid) >
                    parseFloat(stats?.remaining_balance) + 0.01
                }
                className="flex-1 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
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

// Helper
function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}