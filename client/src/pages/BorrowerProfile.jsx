import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../utils/api';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import { getSimulatedDate, getToday } from '../utils/simulatedDate';
import LoanPaidCelebration from '../components/LoanPaidCelebration';

// ─── Credit Rating Helper ──────────────────────────────────────────────────
function computeLoanRating(loanPayments, scheduleEntries, gracePeriod = 3) {
  if (!loanPayments?.length || !scheduleEntries?.length) return null;

  let onTime = 0;
  let late = 0;
  let overdue = 0;
  let totalPenalties = 0;

  const sortedPayments = [...loanPayments].sort(
    (a, b) => new Date(a.payment_date) - new Date(b.payment_date)
  );
  const sortedSchedule = [...scheduleEntries].sort(
    (a, b) => new Date(a.due_date) - new Date(b.due_date)
  );

  sortedPayments.forEach((payment, i) => {
    const schedule = sortedSchedule[i];
    if (!schedule) return;
    const payDate = new Date(payment.payment_date);
    const dueDate = new Date(schedule.due_date);
    const graceCutoff = new Date(dueDate);
    graceCutoff.setDate(graceCutoff.getDate() + gracePeriod);
    const daysLate = Math.ceil((payDate - dueDate) / (1000 * 60 * 60 * 24));

    if (daysLate <= 0) onTime++;
    else if (daysLate <= gracePeriod) onTime++; // within grace = on time
    else if (daysLate <= 14) late++;
    else overdue++;

    if (parseFloat(payment.penalty_amount || 0) > 0) totalPenalties++;
  });

  const total = onTime + late + overdue;
  if (total === 0) return null;

  const score = Math.round(((onTime * 1.0 + late * 0.5 + overdue * 0) / total) * 100);

  let grade, label, color, bg, icon;
  if (score >= 95) { grade = 'A+'; label = 'Excellent'; color = 'text-emerald-700'; bg = 'bg-emerald-50 border-emerald-200'; icon = '⭐'; }
  else if (score >= 85) { grade = 'A'; label = 'Very Good'; color = 'text-green-700'; bg = 'bg-green-50 border-green-200'; icon = '✅'; }
  else if (score >= 70) { grade = 'B'; label = 'Good'; color = 'text-blue-700'; bg = 'bg-blue-50 border-blue-200'; icon = '👍'; }
  else if (score >= 55) { grade = 'C'; label = 'Fair'; color = 'text-yellow-700'; bg = 'bg-yellow-50 border-yellow-200'; icon = '⚠️'; }
  else { grade = 'D'; label = 'Poor'; color = 'text-red-700'; bg = 'bg-red-50 border-red-200'; icon = '❌'; }

  return { score, grade, label, color, bg, icon, onTime, late, overdue, totalPenalties, total };
}

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
    payment_date: (getSimulatedDate() || new Date().toISOString().split('T')[0]),
    notes: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [penalty, setPenalty] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [simDate] = useState(getSimulatedDate());
  const [collectPenalty, setCollectPenalty] = useState(false);
  const [manualPenalty, setManualPenalty] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(null);

  const fetchData = () => {
    setLoading(true);
    const simDate = getSimulatedDate();
    const simParam = simDate ? `?simDate=${simDate}` : '';
    api.get(`/api/borrowers/${id}${simParam}`)
      .then(res => {
        setData(res.data);
        setPenalty(res.data.penalty || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `MicroLend — ${data?.borrower?.full_name}`,
  });

  const handlePayment = async () => {
    setPayError('');
    if (!payment.amount_paid || !payment.payment_date) {
      setPayError('Amount and date are required.');
      return;
    }
    const amountPaid = parseFloat(payment.amount_paid);
    const penaltyExtra = collectPenalty ? parseFloat(manualPenalty || 0) : 0;
    const remaining = parseFloat(stats?.remaining_balance || 0);

    if (amountPaid > remaining + 0.01) {
      setPayError(`Amount exceeds remaining balance of ${formatCurrency(remaining)}. Penalty is separate — reduce the Amount Collected.`);
      return;
    }

    setPayLoading(true);
    try {
      const res = await api.post('/api/payments', {
        loan_id: data.loans[0]?.id,
        borrower_id: id,
        amount_paid: (amountPaid + penaltyExtra).toFixed(2),
        penalty_collected: penaltyExtra > 0 ? penaltyExtra.toFixed(2) : undefined,
        payment_date: payment.payment_date,
        notes: payment.notes
          ? payment.notes + (penaltyExtra > 0 ? ` (incl. ₱${penaltyExtra.toFixed(2)} penalty)` : '')
          : penaltyExtra > 0 ? `Includes ₱${penaltyExtra.toFixed(2)} manual penalty` : '',
      });
      setShowPayModal(false);
      setCollectPenalty(false);
      setManualPenalty('');
      setPayment({
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
        if (res.data.loan_fully_paid) {
          setShowCelebration(true);
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
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>
  );
  if (!data) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">Borrower not found.</div>
  );

  const { borrower, loans, payments, all_payments, stats, next_payment, schedule } = data;

  // Split loans: active/current = first, history = paid ones (all but first if reloan)
  const activeLoan = loans?.find(l => l.status !== 'paid') || loans?.[0];
  const loan = activeLoan;
  const historicalLoans = loans?.filter(l => l.status === 'paid' && l.id !== loan?.id) || [];

  const initials = borrower.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Running balance for current loan payments
  let runningBalance = parseFloat(stats?.total_payable_with_penalty || stats?.total_payable || 0);
  const sortedPayments = [...(payments || [])].sort(
    (a, b) => new Date(a.payment_date) - new Date(b.payment_date)
  );
  const paymentRows = sortedPayments.map(p => {
    runningBalance -= parseFloat(p.amount_paid);
    return {
      ...p,
      running_balance: parseFloat(runningBalance.toFixed(2)),
      penalty_amount: parseFloat(p.penalty_amount || 0),
    };
  });

  const progressPercent = stats?.total_payable_with_penalty > 0
    ? Math.min((parseFloat(stats.total_paid) / parseFloat(stats.total_payable_with_penalty)) * 100, 100)
    : 0;

  const totalPayable = parseFloat(stats?.total_payable || 0);
  const termMonths = parseInt(stats?.term_months || 1);
  const monthlyDue = totalPayable / termMonths;
  let perPeriodDue = monthlyDue;
  let frequencyLabel = 'Monthly';
  if (loan?.payment_frequency === 'semi_monthly') { perPeriodDue = monthlyDue / 2; frequencyLabel = 'Semi-Monthly'; }
  else if (loan?.payment_frequency === 'weekly') { perPeriodDue = monthlyDue / 4; frequencyLabel = 'Weekly'; }

  // Overall credit rating from ALL payments + schedules across all loans
  const overallRating = computeLoanRating(payments, schedule, 3);

  return (
    <div>
      <button onClick={() => navigate('/borrowers')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 font-medium no-print">
        ← Back to Borrowers
      </button>

      <div>
        {/* ── PROFILE HEADER ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {photo ? (
                <img src={photo} alt="borrower" className="w-16 h-16 rounded-full object-cover border-2 border-blue-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700">
                  {initials}
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">{borrower.full_name}</h2>
                  {/* Overall Credit Badge */}
                  {overallRating && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${overallRating.bg} ${overallRating.color}`}>
                      <span>{overallRating.icon}</span>
                      <span>{overallRating.grade} · {overallRating.label}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loan?.payment_frequency?.replace('_', '-')} Payment &nbsp;·&nbsp;
                  {formatPercent(loan?.interest_rate)} Interest &nbsp;·&nbsp;
                  {borrower.contact_number || 'No contact'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={loan?.status || 'active'} />
                  {historicalLoans.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                      {historicalLoans.length + 1}× borrower
                    </span>
                  )}
                  {borrower.address && (
                    <span className="text-xs text-gray-400">📍 {borrower.address}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap justify-end">
              <button onClick={() => setShowInfoModal(true)}
                className="px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg text-sm font-semibold hover:bg-blue-100">
                👤 View Info
              </button>
              <button onClick={() => setShowDocsModal(true)}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-gray-50 rounded-lg text-sm font-semibold hover:bg-gray-100">
                📎 Documents
              </button>
              {loan?.status !== 'paid' && (
                <button onClick={() => setShowPayModal(true)}
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800">
                  + Record Payment
                </button>
              )}
              {loan?.status === 'paid' && parseFloat(stats?.remaining_balance || 0) <= 0.01 && (
                <button onClick={() => navigate(`/loans/new?borrower_id=${id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                  + New Loan
                </button>
              )}
              <button onClick={handlePrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Loan Amount</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(stats?.loan_amount)}</div>
            <div className="text-xs text-gray-400 mt-1">Principal</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Payable</div>
            <div className="text-xl font-bold text-gray-800">{formatCurrency(stats?.total_payable)}</div>
            <div className="text-xs text-gray-400 mt-1">Principal + Interest</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Paid</div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(stats?.total_paid)}</div>
            <div className="text-xs text-gray-400 mt-1">Payments received</div>
          </div>
          {penalty?.total_penalty > 0 ? (
            <div className="rounded-xl p-4 shadow-sm text-center border bg-red-50 border-red-200">
              <div className="text-xs font-medium mb-1 text-gray-500">Penalty</div>
              <div className="text-xl font-bold text-red-600">+{formatCurrency(penalty?.total_penalty)}</div>
              <div className="text-xs text-red-400 mt-1">{penalty?.overdue_periods} unpaid</div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 font-medium mb-1">Penalty</div>
              <div className="text-xl font-bold text-gray-400">₱0.00</div>
              <div className="text-xs text-gray-400 mt-1">No overdue</div>
            </div>
          )}
          <div className={`rounded-xl p-4 shadow-sm text-center border ${penalty?.total_penalty > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="text-xs text-gray-500 font-medium mb-1">Amount Receivable</div>
            <div className={`text-xl font-bold ${penalty?.total_penalty > 0 ? 'text-red-600' : 'text-orange-600'}`}>
              {formatCurrency(stats?.remaining_balance)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {penalty?.total_penalty > 0 ? 'Includes penalty' : 'Still to collect'}
            </div>
          </div>
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
            <span>Repayment Progress</span>
            <span>{progressPercent.toFixed(1)}% paid</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4">
            <div className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Paid: {formatCurrency(stats?.total_paid)}</span>
            <span className="font-semibold text-blue-700">{frequencyLabel} Due: {formatCurrency(perPeriodDue)}</span>
            <span>Remaining: {formatCurrency(stats?.remaining_balance)}</span>
          </div>
        </div>

        {/* Loan fully paid notice */}
        {loan?.status === 'paid' && parseFloat(stats?.remaining_balance || 0) <= 0.01 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="text-base font-bold text-green-700">Loan Fully Paid!</div>
              <div className="text-sm text-green-600">This borrower has completed all payments successfully.</div>
            </div>
          </div>
        )}

        {/* ── LOAN INFO ── */}
        {loan && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">
              Loan Information
            </div>
            <div className="grid grid-cols-6 gap-4 text-sm">
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
                <div className="text-xs text-gray-400 font-medium">{frequencyLabel} Payment</div>
                <div className="font-bold text-blue-700">{formatCurrency(perPeriodDue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Last Period Due</div>
                {(() => {
                  const lastEntry = schedule?.[schedule.length - 1];
                  const lastDate = lastEntry?.due_date;
                  const isPast = lastDate && new Date(lastDate) < new Date();
                  return (
                    <div className={`font-semibold ${isPast && loan.status !== 'paid' ? 'text-red-600' : 'text-gray-800'}`}>
                      {lastDate ? formatDate(lastDate) : '—'}
                      {isPast && loan.status !== 'paid' && <span className="ml-1 text-xs text-red-400">(past due)</span>}
                    </div>
                  );
                })()}
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
              <tr className="border-t border-gray-100 bg-blue-50">
                <td className="px-5 py-3 text-sm text-gray-600">{formatDate(loan?.release_date)}</td>
                <td className="px-5 py-3 text-sm font-semibold text-blue-700">Loan Released</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">{formatCurrency(stats?.loan_amount)}</td>
                <td className="px-5 py-3 text-right text-sm text-purple-600">
                  +{formatCurrency(parseFloat(stats?.loan_amount || 0) * parseFloat(stats?.interest_rate || 0) / 100)}
                </td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">{formatCurrency(stats?.total_payable)}</td>
              </tr>
              {paymentRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No payments recorded yet.</td>
                </tr>
              )}
              {paymentRows.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-600">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {p.notes || 'Payment Received'}
                    {p.penalty_amount > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                        +{formatCurrency(p.penalty_amount)} penalty
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-green-600">+{formatCurrency(p.amount_paid)}</td>
                  <td className="px-5 py-3 text-right text-sm text-purple-600">{formatCurrency(p.interest_collected)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-800">{formatCurrency(p.running_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── LOAN HISTORY (past paid loans) ── */}
        {historicalLoans.length > 0 && (
          <div className="mb-4">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                📋 Loan History — {historicalLoans.length} Previous Loan{historicalLoans.length !== 1 ? 's' : ''}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-3">
              {historicalLoans.map((histLoan, loanIdx) => {
                // Compute stats for this historical loan
                const histPayments = (all_payments || payments || []).filter(
                  p => String(p.loan_id) === String(histLoan.id)
                );
                const histTotalPaid = histPayments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
                const histTotalInterest = parseFloat(histLoan.loan_amount) * (parseFloat(histLoan.interest_rate) / 100);
                const histTotalPayable = parseFloat(histLoan.loan_amount) + histTotalInterest;
                const histTotalPenalty = histPayments.reduce((s, p) => s + parseFloat(p.penalty_amount || 0), 0);
                const histInterestEarned = histPayments.reduce((s, p) => s + parseFloat(p.interest_collected || 0), 0);

                // Per-period for this loan
                const histMonthly = histTotalPayable / parseInt(histLoan.term_months || 1);
                let histPerPeriod = histMonthly;
                let histFreqLabel = 'Monthly';
                if (histLoan.payment_frequency === 'semi_monthly') { histPerPeriod = histMonthly / 2; histFreqLabel = 'Semi-Monthly'; }
                else if (histLoan.payment_frequency === 'weekly') { histPerPeriod = histMonthly / 4; histFreqLabel = 'Weekly'; }

                // Rating for this specific loan
                const histDummySchedule = histPayments.map((p, i) => ({
                  due_date: p.payment_date,
                  id: i
                }));
                const histRating = computeLoanRating(histPayments, histDummySchedule, 3);

                const isExpanded = expandedHistory === histLoan.id;

                // Running balance for history payments
                  let histRunning = histTotalPayable + histTotalPenalty;
                  const histPaymentRows = [...histPayments]
                    .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))
                    .map(p => {
                      histRunning -= parseFloat(p.amount_paid);
                      return {
                        ...p,
                        running_balance: parseFloat(histRunning.toFixed(2)),
                        penalty_amount: parseFloat(p.penalty_amount || 0),
                      };
                    });
                return (
                  <div key={histLoan.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* History Loan Header */}
                    <div
                      className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedHistory(isExpanded ? null : histLoan.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Loan number badge */}
                        <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
                          #{loans.length - loanIdx - 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">
                              Loan — {formatDate(histLoan.release_date)}
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                              ✓ Fully Paid
                            </span>
                            {/* Rating badge */}
                            {histRating && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${histRating.bg} ${histRating.color}`}>
                                {histRating.icon} {histRating.grade} · {histRating.label}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {histFreqLabel} · {formatPercent(histLoan.interest_rate)} interest · {histLoan.term_months} months
                            {histLoan.purpose && ` · ${histLoan.purpose}`}
                          </div>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-xs text-gray-400">Loan Amount</div>
                          <div className="text-sm font-bold text-blue-700">{formatCurrency(histLoan.loan_amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Total Payable</div>
                          <div className="text-sm font-bold text-gray-700">{formatCurrency(histTotalPayable)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Total Paid</div>
                          <div className="text-sm font-bold text-green-600">{formatCurrency(histTotalPaid)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Interest Earned</div>
                          <div className="text-sm font-bold text-purple-600">{formatCurrency(histInterestEarned)}</div>
                        </div>
                        {histTotalPenalty > 0 && (
                          <div>
                            <div className="text-xs text-gray-400">Penalties</div>
                            <div className="text-sm font-bold text-red-500">{formatCurrency(histTotalPenalty)}</div>
                          </div>
                        )}
                        <div className="text-gray-400 text-lg ml-2">
                          {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>
                    </div>

                    {/* Expanded: Credit Rating + Payment History */}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {/* Credit Rating Detail */}
                        {histRating && (
                          <div className={`mx-5 mt-4 mb-3 rounded-xl border p-4 ${histRating.bg}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{histRating.icon}</span>
                                <div>
                                  <div className={`text-base font-bold ${histRating.color}`}>
                                    Payment Rating: {histRating.grade} — {histRating.label}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Based on {histRating.total} payment{histRating.total !== 1 ? 's' : ''} recorded
                                  </div>
                                </div>
                              </div>
                              <div className={`text-3xl font-black ${histRating.color}`}>
                                {histRating.score}
                                <span className="text-sm font-normal text-gray-400">/100</span>
                              </div>
                            </div>
                            {/* Score breakdown */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                                <div className="text-lg font-bold text-green-600">{histRating.onTime}</div>
                                <div className="text-xs text-gray-500">On Time / Grace</div>
                              </div>
                              <div className="bg-white rounded-lg p-2 text-center border border-yellow-100">
                                <div className="text-lg font-bold text-yellow-600">{histRating.late}</div>
                                <div className="text-xs text-gray-500">Late (≤14 days)</div>
                              </div>
                              <div className="bg-white rounded-lg p-2 text-center border border-red-100">
                                <div className="text-lg font-bold text-red-600">{histRating.overdue}</div>
                                <div className="text-xs text-gray-500">Very Late (&gt;14 days)</div>
              </div>
                            </div>
                            {/* Score bar */}
                            <div className="mt-3">
                              <div className="w-full bg-white rounded-full h-2 border border-gray-200">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    histRating.score >= 85 ? 'bg-green-500' :
                                    histRating.score >= 70 ? 'bg-blue-500' :
                                    histRating.score >= 55 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${histRating.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Loan summary cards */}
                        <div className="grid grid-cols-4 gap-3 px-5 mb-4">
                          {[
                            { label: 'Loan Amount', value: formatCurrency(histLoan.loan_amount), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                            { label: 'Total Payable', value: formatCurrency(histTotalPayable), color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
                            { label: 'Total Paid', value: formatCurrency(histTotalPaid), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                            { label: 'Amount Receivable', value: formatCurrency(Math.max(0, histTotalPayable - histTotalPaid)), color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                          ].map(m => (
                            <div key={m.label} className={`rounded-xl p-3 border text-center ${m.bg}`}>
                              <div className="text-xs text-gray-400 font-medium mb-1">{m.label}</div>
                              <div className={`text-base font-bold ${m.color}`}>{m.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Loan info row */}
                        <div className="mx-5 mb-4 bg-gray-50 border border-gray-100 rounded-xl p-3 grid grid-cols-5 gap-4 text-xs">
                          <div>
                            <div className="text-gray-400 font-medium mb-1">Release Date</div>
                            <div className="font-semibold text-gray-700">{formatDate(histLoan.release_date)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium mb-1">Term</div>
                            <div className="font-semibold text-gray-700">{histLoan.term_months} months</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium mb-1">Frequency</div>
                            <div className="font-semibold text-gray-700 capitalize">{histLoan.payment_frequency?.replace('_', '-')}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium mb-1">{histFreqLabel} Payment</div>
                            <div className="font-bold text-blue-700">{formatCurrency(histPerPeriod)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium mb-1">Purpose</div>
                            <div className="font-semibold text-gray-700">{histLoan.purpose || '—'}</div>
                          </div>
                        </div>

                        {/* Payment history table */}
                        <table className="w-full text-sm mb-4">
                          <thead>
                            <tr className="bg-gray-50 border-t border-gray-100">
                              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Date</th>
                              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Description</th>
                              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Amount Paid</th>
                              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Interest</th>
                              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Opening entry */}
                            <tr className="border-t border-gray-100 bg-blue-50">
                              <td className="px-5 py-2.5 text-xs text-gray-600">{formatDate(histLoan.release_date)}</td>
                              <td className="px-5 py-2.5 text-xs font-semibold text-blue-700">Loan Released</td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-blue-700">{formatCurrency(histLoan.loan_amount)}</td>
                              <td className="px-5 py-2.5 text-right text-xs text-purple-600">
                                +{formatCurrency(histTotalInterest)}
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-800">{formatCurrency(histTotalPayable)}</td>
                            </tr>
                            {histPaymentRows.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-5 py-6 text-center text-gray-400 text-xs">No payments recorded.</td>
                              </tr>
                            )}
                            {histPaymentRows.map((p) => (
                              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-5 py-2.5 text-xs text-gray-600">{formatDate(p.payment_date)}</td>
                                <td className="px-5 py-2.5 text-xs text-gray-700">
                                  {p.notes || 'Payment Received'}
                                  {parseFloat(p.penalty_amount || 0) > 0 && (
                                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                                      +{formatCurrency(p.penalty_amount)} penalty
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-2.5 text-right text-xs font-bold text-green-600">+{formatCurrency(p.amount_paid)}</td>
                                <td className="px-5 py-2.5 text-right text-xs text-purple-600">{formatCurrency(p.interest_collected)}</td>
                                <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-800">{formatCurrency(p.running_balance)}</td>
                              </tr>
                            ))}
                            {/* Closing row */}
                            <tr className="border-t-2 border-green-200 bg-green-50">
                              <td colSpan={4} className="px-5 py-2.5 text-xs font-bold text-green-700">✓ Loan Completed</td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-green-700">₱0.00</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>{/* end screen content */}

      {/* ── PRINT-ONLY CONTENT ── */}
      <div ref={printRef} className="hidden print:block">
        <style>{`
          @media print {
            @page { margin: 20mm 15mm; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #1d4ed8' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a' }}>L.A. and M.J. Micro Lending Corporation</div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Borrower Account Record</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            Printed: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' })}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>{borrower.full_name}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {borrower.contact_number && <span>📞 {borrower.contact_number} · </span>}
              {borrower.address && <span>📍 {borrower.address}</span>}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {loan?.payment_frequency?.replace('_', '-')} · {formatPercent(loan?.interest_rate)} interest · {loan?.term_months} months
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {overallRating && (
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Credit Rating: {overallRating.icon} {overallRating.grade} — {overallRating.label} ({overallRating.score}/100)
              </div>
            )}
            <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '9999px',
              backgroundColor: loan?.status === 'paid' ? '#dcfce7' : '#dbeafe',
              color: loan?.status === 'paid' ? '#15803d' : '#1d4ed8',
              border: `1px solid ${loan?.status === 'paid' ? '#86efac' : '#93c5fd'}` }}>
              {loan?.status === 'paid' ? '✓ Fully Paid' : 'Active'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Loan Amount', value: formatCurrency(stats?.loan_amount), color: '#1d4ed8' },
            { label: 'Total Payable', value: formatCurrency(stats?.total_payable), color: '#111827' },
            { label: 'Total Paid', value: formatCurrency(stats?.total_paid), color: '#15803d' },
            { label: 'Remaining Balance', value: formatCurrency(stats?.remaining_balance), color: '#ea580c' },
          ].map((item, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
            <span>Repayment Progress</span>
            <span style={{ fontWeight: '600', color: '#1d4ed8' }}>{progressPercent.toFixed(1)}% paid</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '9999px' }} />
          </div>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }}>Transaction History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {['Date','Description','Amount Paid','Interest','Running Balance'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Date' || h === 'Description' ? 'left' : 'right', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '7px 10px', color: '#374151' }}>{formatDate(loan?.release_date)}</td>
                <td style={{ padding: '7px 10px', fontWeight: '600', color: '#1d4ed8' }}>Loan Released</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#1d4ed8' }}>{formatCurrency(stats?.loan_amount)}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', color: '#7c3aed' }}>+{formatCurrency(parseFloat(stats?.loan_amount || 0) * parseFloat(stats?.interest_rate || 0) / 100)}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>{formatCurrency(stats?.total_payable)}</td>
              </tr>
              {paymentRows.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ padding: '7px 10px', color: '#374151' }}>{formatDate(p.payment_date)}</td>
                  <td style={{ padding: '7px 10px', color: '#374151' }}>{p.notes || 'Payment Received'}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#15803d' }}>+{formatCurrency(p.amount_paid)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#7c3aed' }}>{formatCurrency(p.interest_collected)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>{formatCurrency(p.running_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
          <span>L.A. and M.J. Micro Lending Corporation — Confidential</span>
          <span>Generated: {new Date().toLocaleString('en-PH')}</span>
        </div>
      </div>

{/* ── BORROWER INFO MODAL ── */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl shadow-xl max-h-[95vh] flex flex-col">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">👤 Borrower Information</h3>
              <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Photo */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                {photo ? (
                  <img src={photo} alt="borrower" className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-3xl font-bold text-blue-700">{initials}</div>
                )}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Profile Photo (Optional)</div>
                  <label className="cursor-pointer text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium">
                    📷 Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>

              {/* Personal Information */}
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

              {/* Financial Information */}
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

              {/* Amortization & Receipt */}
              <div>
                <div className="text-sm font-bold text-blue-700 mb-3">Amortization & Receipt</div>

                {/* Loan summary read-only fields */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <InfoRow label="Release Date" value={formatDate(loan?.release_date)} />
                  <InfoRow label="Term" value={loan?.term_months ? `${loan.term_months} months` : null} />
                  <InfoRow label="Payment Frequency" value={loan?.payment_frequency?.replace('_', '-')} />
                  <InfoRow label={`${frequencyLabel} Payment`} value={formatCurrency(perPeriodDue)} />
                  <InfoRow label="Loan Amount" value={formatCurrency(stats?.loan_amount)} />
                  <InfoRow label="Total Payable" value={formatCurrency(stats?.total_payable)} />
                  <InfoRow label="Purpose" value={loan?.purpose} />
                </div>

<div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Signatures on File</div>
                  <div className="grid grid-cols-2 gap-3">
<SigRow label="Applicant Signature" value={loan?.applicant_signature} name={borrower.full_name} />
                    <SigRow label="Recommended for Approval" value={loan?.recommended_by} name={loan?.recommended_by_name} />
                    <SigRow label="Co-Maker Signature" value={loan?.co_maker_signature} name={borrower.co_maker} />
                    <InfoRow label="Manager" value={loan?.manager} />
                    <SigRow label="Approved by" value={loan?.approve} name={loan?.approve_name} />
                    <SigRow label="Received by" value={loan?.received_by} name={loan?.received_by_name} />
                    <SigRow label="Copy Received" value={loan?.copy_received} name={loan?.copy_received_name} />
                    <SigRow label="C.I. / Collector" value={loan?.ci_collector} name={loan?.ci_collector_name} />
                    <SigRow label="Prepared by" value={loan?.prepared_by} name={loan?.prepared_by_name} />
                    <SigRow label="Verified by" value={loan?.verified_by} name={loan?.verified_by_name} />
                    <SigRow label="Entered by" value={loan?.entered_by} name={loan?.entered_by_name} />
                    <SigRow label="Final Approved by" value={loan?.approved_by} name={loan?.approved_by_name} />
                  </div>
                </div>
              </div>

            </div>{/* end scrollable body */}

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
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
              <button onClick={() => setShowDocsModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-6">
              <div className="text-sm font-semibold text-gray-700 mb-1">Upload Documents (Optional)</div>
              <div className="text-xs text-gray-400 mb-3">Driver's License, SSS Card, Birth Certificate, etc.</div>
              <label className="cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 rounded-xl p-6 text-sm text-blue-700 hover:bg-blue-50 transition-colors mb-4">
                📁 Click to upload documents
                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
              </label>
              {uploadedDocs.length === 0 && <div className="text-center text-gray-400 text-sm py-2">No documents uploaded yet.</div>}
              <div className="space-y-2">
                {uploadedDocs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{doc.type.includes('pdf') ? '📄' : '🖼️'}</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{doc.name}</div>
                        <div className="text-xs text-gray-400">Uploaded {doc.uploadedAt}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.type.includes('image') && (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline font-medium">View</a>
                      )}
                      <button onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-base font-bold text-blue-700">{initials}</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{borrower.full_name}</h3>
                  <p className="text-xs text-gray-500">{frequencyLabel} · {formatPercent(loan?.interest_rate)} interest · {loan?.term_months} months</p>
                </div>
                <StatusBadge status={loan?.status || 'active'} />
              </div>
              <button onClick={() => { setShowPayModal(false); setPayError(''); }}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200">×</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* LEFT PANEL */}
              <div className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto p-5 flex flex-col gap-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Summary</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Loan Amount', value: formatCurrency(stats?.loan_amount), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                    { label: 'Total Payable', value: formatCurrency(stats?.total_payable), color: 'text-gray-800', bg: 'bg-white border-gray-200' },
                    { label: 'Total Paid', value: formatCurrency(stats?.total_paid), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                    { label: 'Remaining', value: formatCurrency(stats?.remaining_balance),
                      color: penalty?.total_penalty > 0 ? 'text-red-600' : 'text-orange-600',
                      bg: penalty?.total_penalty > 0 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100' },
                  ].map((m) => (
                    <div key={m.label} className={`rounded-xl p-3 border text-center ${m.bg}`}>
                      <div className="text-xs text-gray-400 font-medium mb-1">{m.label}</div>
                      <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Repayment Progress</span>
                    <span className="font-semibold text-blue-700">{progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Loan Info</div>
                  {[
                    { label: 'Release Date', value: formatDate(loan?.release_date) },
                    { label: 'Term', value: `${loan?.term_months} months` },
                    { label: 'Frequency', value: frequencyLabel },
                    { label: `${frequencyLabel} Due`, value: formatCurrency(perPeriodDue), blue: true },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-semibold ${row.blue ? 'text-blue-700' : 'text-gray-800'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
{/* Missed periods display — always show if overdue exists */}
{penalty?.overdue_periods > 0 && (
  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
    <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
      ⚠ Overdue Periods
    </div>

    {/* Missed periods summary */}
    <div className="bg-white border border-red-100 rounded-lg px-3 py-2 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-red-600">
            {penalty.overdue_periods}
          </span>
          <div>
            <div className="text-xs font-bold text-red-700">
              Missed Period{penalty.overdue_periods !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-red-400">
              {penalty.grace_period_days} day grace period
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-red-400">Total Overdue</div>
          <div className="text-sm font-bold text-red-700">
            {formatCurrency(
              penalty.penalty_breakdown.reduce(
                (s, p) => s + parseFloat(p.amount_due), 0
              )
            )}
          </div>
        </div>
      </div>

      {/* Period dots */}
      <div className="flex gap-1 mt-2 flex-wrap">
        {penalty.penalty_breakdown.map((p, i) => (
          <div
            key={i}
            title={`Period ${i + 1} — ${p.days_overdue} days overdue`}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              p.within_grace
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-red-500 text-white'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>

    {/* Penalty breakdown if any */}
    {penalty?.total_penalty > 0 && (
      <div className="space-y-1.5">
        {penalty.penalty_breakdown.map((p, i) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between text-red-700 font-semibold">
              <span>Period {i + 1} — {formatDate(p.due_date)}</span>
              <span>{formatCurrency(p.amount_due)}</span>
            </div>
            <div className="flex justify-between text-red-400 pl-2 mt-0.5">
              <span>
                {p.days_overdue} days late ·
                {p.within_grace
                  ? ' within grace'
                  : ` penalty (${penalty.penalty_rate})`
                }
              </span>
              <span className="font-semibold">
                {p.within_grace ? '—' : `+${formatCurrency(p.penalty)}`}
              </span>
            </div>
          </div>
        ))}
        <div className="border-t border-red-200 pt-1.5 flex justify-between text-red-700 font-bold text-xs">
          <span>Total Penalty</span>
          <span>+{formatCurrency(penalty.total_penalty)}</span>
        </div>
      </div>
    )}
  </div>
)}
                {next_payment && loan?.status !== 'paid' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">📅 Next Period</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs font-semibold text-blue-700">{formatDate(next_payment.due_date)}</div>
                        <div className="text-xs text-blue-400">{frequencyLabel} installment</div>
                      </div>
                      <div className="text-sm font-bold text-blue-700">{formatCurrency(next_payment.amount_due)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Record Payment</div>

                {/* Overdue suggested options */}
                {penalty?.total_penalty > 0 && penalty?.penalty_breakdown?.length > 0 && (() => {
                  const overduePlusPenalty = penalty.penalty_breakdown.reduce(
                    (s, p) => s + parseFloat(p.amount_due) + parseFloat(p.penalty || 0), 0
                  );
                  const nextAmount = (next_payment && !penalty.penalty_breakdown.find(p => p.due_date === next_payment.due_date))
                    ? parseFloat(next_payment.amount_due) : 0;
                  const suggestedTotal = parseFloat((overduePlusPenalty + nextAmount).toFixed(2));
                  const overdueOnly = parseFloat(overduePlusPenalty.toFixed(2));
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">💡 Suggested Payment Options</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2.5">
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{formatCurrency(overdueOnly)}</div>
                            <div className="text-xs text-gray-400">Clears {penalty.penalty_breakdown.length} overdue period{penalty.penalty_breakdown.length !== 1 ? 's' : ''} + penalty</div>
                          </div>
                          <button onClick={() => setPayment(p => ({ ...p, amount_paid: overdueOnly.toString() }))}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600">Use</button>
                        </div>
                        {nextAmount > 0 && (
                          <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2.5">
                            <div>
                              <div className="text-sm font-bold text-blue-700">{formatCurrency(suggestedTotal)}</div>
                              <div className="text-xs text-gray-400">Overdue + penalty + next period ({formatDate(next_payment?.due_date)})</div>
                            </div>
                            <button onClick={() => setPayment(p => ({ ...p, amount_paid: suggestedTotal.toString() }))}
                              className="px-3 py-1.5 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800">Use</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Normal suggested */}
                {(!penalty?.total_penalty || penalty.total_penalty === 0) && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Suggested ({frequencyLabel})</div>
                      <div className="text-lg font-bold text-blue-700">{formatCurrency(perPeriodDue)}</div>
                    </div>
                    <button onClick={() => setPayment(p => ({ ...p, amount_paid: perPeriodDue.toFixed(2).toString() }))}
                      className="px-4 py-2 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800">
                      Use This Amount
                    </button>
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Amount Collected (₱) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₱</span>
                      <input type="number" step="0.01"
                        className={`w-full border rounded-xl pl-7 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          parseFloat(payment.amount_paid) > parseFloat(stats?.remaining_balance) + 0.01
                            ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 bg-white'
                        }`}
                        value={payment.amount_paid}
                        onChange={e => setPayment(p => ({ ...p, amount_paid: e.target.value }))}
                        placeholder="0.00" autoFocus />
                    </div>
                    {parseFloat(payment.amount_paid) > parseFloat(stats?.remaining_balance) + 0.01 ? (
                      <p className="text-xs text-red-500 mt-1.5 font-semibold">⚠ Exceeds remaining balance of {formatCurrency(stats?.remaining_balance)}</p>
                    ) : payment.amount_paid ? (
                      <p className="text-xs text-green-600 mt-1.5 font-medium">
                        ✓ Balance after payment: {formatCurrency(Math.max(0, parseFloat(stats?.remaining_balance || 0) - parseFloat(payment.amount_paid || 0)))}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1.5">Interest is already included in the payment amount.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Date <span className="text-red-500">*</span></label>
                    <input type="date"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      value={payment.payment_date}
                      onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      value={payment.notes}
                      onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                      placeholder="e.g. Week 1 payment, partial payment..." />
                  </div>
                </div>

                {payError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span>⚠</span> {payError}
                  </div>
                )}

                {/* Collect Additional Penalty */}
                <div className="border border-dashed border-gray-300 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-700">💰 Collect Additional Penalty</div>
                      <div className="text-xs text-gray-400 mt-0.5">Optional — add a manual penalty charge to this payment</div>
                    </div>
                    <button onClick={() => { setCollectPenalty(v => !v); setManualPenalty(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        collectPenalty ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                      }`}>
                      {collectPenalty ? '✕ Cancel' : '+ Add Penalty'}
                    </button>
                  </div>
                  {collectPenalty && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-xs font-semibold text-gray-600">Penalty Amount (₱)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                        <input type="number" step="0.01" min="0" value={manualPenalty}
                          onChange={e => setManualPenalty(e.target.value)}
                          className="w-full border border-red-300 rounded-lg pl-7 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 bg-red-50"
                          placeholder="0.00" />
                      </div>
                      {manualPenalty && parseFloat(manualPenalty) > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                          <div className="flex justify-between font-semibold">
                            <span>Regular Payment</span><span>{formatCurrency(payment.amount_paid || 0)}</span>
                          </div>
                          <div className="flex justify-between mt-0.5 text-red-500">
                            <span>+ Penalty Collected</span><span>+{formatCurrency(manualPenalty)}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-red-200 mt-1 pt-1">
                            <span>Total Cash Received</span>
                            <span>{formatCurrency((parseFloat(payment.amount_paid || 0) + parseFloat(manualPenalty || 0)).toFixed(2))}</span>
                          </div>
                          <p className="text-red-400 mt-1.5 leading-tight">
                            Only ₱{parseFloat(payment.amount_paid || 0).toFixed(2)} is applied to loan balance. Penalty is recorded separately.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2 mt-auto">
                  <button onClick={() => { setShowPayModal(false); setPayError(''); }}
                    className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handlePayment}
                    disabled={payLoading || !payment.amount_paid || parseFloat(payment.amount_paid) <= 0 || parseFloat(payment.amount_paid) > parseFloat(stats?.remaining_balance) + 0.01}
                    className="flex-1 py-3 bg-blue-700 text-white rounded-xl text-sm font-bold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                    {payLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Payment ↗'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
  <LoanPaidCelebration
    borrower={borrower}
    loan={loan}
    stats={stats}
    onNewLoan={() => { setShowCelebration(false); navigate(`/loans/new?borrower_id=${id}`); }}
    onClose={() => setShowCelebration(false)}
  />
)}
    </div>
  );
}

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
function SigRow({ label, value }) {
  const parsed = (() => {
    if (!value) return { sig: '', name: '' };
    if (typeof value === 'string') {
      try {
        const obj = JSON.parse(value);
        if (obj && obj.sig !== undefined) return obj;
      } catch {}
      return { sig: value, name: '' };
    }
    return value;
  })();

  const isImage = parsed.sig && parsed.sig.startsWith('data:image');
  const isText = parsed.sig && !parsed.sig.startsWith('data:image');

  return (
    <div>
      <div className="text-xs text-gray-400 font-medium mb-0.5">{label}</div>
      <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        <div className="min-h-[48px] flex items-center justify-center border-b border-gray-200 mb-1">
          {isImage ? (
            <img src={parsed.sig} alt={label} className="max-h-12 max-w-full object-contain" />
          ) : isText ? (
            <span className="text-sm font-semibold text-gray-800">{parsed.sig}</span>
          ) : (
            <span className="text-gray-300 text-sm">—</span>
          )}
        </div>
        <div className="text-xs text-center text-gray-600 font-medium truncate">
          {parsed.name || <span className="text-gray-300">—</span>}
        </div>
      </div>


    </div>
  );
}