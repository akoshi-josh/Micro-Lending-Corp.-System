const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/payments
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, b.full_name, l.loan_amount,
        l.interest_rate, l.payment_frequency
      FROM payments p
      JOIN borrowers b ON b.id = p.borrower_id
      JOIN loans l ON l.id = p.loan_id
      ORDER BY p.payment_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/payments/loan/:loanId
router.get('/loan/:loanId', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    const result = await pool.query(
      `SELECT p.*, b.full_name FROM payments p
       JOIN borrowers b ON b.id = p.borrower_id
       WHERE p.loan_id = $1 ORDER BY p.payment_date DESC`,
      [loanId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/payments
router.post('/', verifyToken, async (req, res) => {
  const { loan_id, borrower_id, amount_paid, payment_date, notes } = req.body;

  if (!loan_id || !borrower_id || !amount_paid || !payment_date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get loan
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1', [loan_id]
    );
    const loan = loanResult.rows[0];
    if (!loan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found.' });
    }

    // Get settings
    const settingsResult = await client.query(
      'SELECT * FROM system_settings LIMIT 1'
    );
    const sysSettings = settingsResult.rows[0] || {
      penalty_rate: 2, grace_period: 3
    };

    // Total periods
    const schedCountResult = await client.query(
      'SELECT COUNT(*) FROM payment_schedule WHERE loan_id = $1',
      [loan_id]
    );
    const totalPeriods = parseInt(schedCountResult.rows[0].count) || 1;

    // Total interest and payable
    const totalInterest = parseFloat(loan.loan_amount) *
      (parseFloat(loan.interest_rate) / 100);
    const totalPayable = parseFloat(loan.loan_amount) + totalInterest;

    // Already paid (principal + interest payments)
    const alreadyPaidResult = await client.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS paid
       FROM payments WHERE loan_id = $1`,
      [loan_id]
    );
    const alreadyPaid = parseFloat(alreadyPaidResult.rows[0].paid);


// Get unpaid penalty charges
const unpaidPenaltyResult = await client.query(
  `SELECT COALESCE(SUM(amount), 0) AS total
   FROM penalty_charges
   WHERE loan_id = $1 AND is_paid = FALSE`,
  [loan_id]
);
const totalUnpaidPenalty = parseFloat(
  unpaidPenaltyResult.rows[0].total
);

// Total remaining = base remaining + unpaid penalties
const baseRemaining = totalPayable - alreadyPaid;
const totalRemaining = parseFloat(
  (baseRemaining + totalUnpaidPenalty).toFixed(2)
);

const amountPaid = parseFloat(amount_paid);

// Safety check
if (amountPaid > totalRemaining + 0.01) {
  await client.query('ROLLBACK');
  return res.status(400).json({
    error: `Payment ₱${amountPaid.toFixed(2)} exceeds balance ₱${totalRemaining.toFixed(2)}.`
  });
}

    // Interest per period
    const interestPerPeriod = totalInterest / totalPeriods;

    // Get all unpaid schedules ordered by due date
    const unpaidSchedules = await client.query(
      `SELECT * FROM payment_schedule
       WHERE loan_id = $1 AND status IN ('overdue','pending')
       ORDER BY due_date ASC`,
      [loan_id]
    );

    // Count periods this payment covers
    let remainingPayment = amountPaid;
    let periodsToMark = 0;

    for (const schedule of unpaidSchedules.rows) {
      const due = parseFloat(schedule.amount_due);
      if (remainingPayment >= due - 0.01) {
        remainingPayment -= due;
        periodsToMark++;
      } else {
        if (remainingPayment > 0) {
          periodsToMark = Math.max(periodsToMark, 1);
        }
        break;
      }
    }

    // Interest collected
    const interestCollected = Math.min(
      interestPerPeriod * Math.max(periodsToMark, 1),
      totalInterest,
      amountPaid
    );

// How much of this payment goes to penalty vs loan
// Penalty is paid first, then the rest goes to loan principal+interest
const penaltyPortionPaid = Math.min(totalUnpaidPenalty, amountPaid);
const loanPortionPaid = amountPaid - penaltyPortionPaid;

// Save payment — amount_paid includes everything (penalty + loan)
const paymentResult = await client.query(
  `INSERT INTO payments
    (loan_id, borrower_id, amount_paid, interest_collected,
     penalty_amount, payment_date, notes)
   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  [
    loan_id, borrower_id, amountPaid,
    parseFloat(interestCollected.toFixed(2)),
    parseFloat(penaltyPortionPaid.toFixed(2)),
    payment_date, notes || null
  ]
);

// Only mark penalties as paid if this payment covers them
if (penaltyPortionPaid >= totalUnpaidPenalty - 0.01) {
  // Full penalty covered — mark all as paid
  await client.query(
    `UPDATE penalty_charges SET is_paid = TRUE
     WHERE loan_id = $1 AND is_paid = FALSE`,
    [loan_id]
  );
} else if (penaltyPortionPaid > 0) {
  // Partial penalty — mark individual ones as paid until amount runs out
  const unpaidPenalties = await client.query(
    `SELECT * FROM penalty_charges
     WHERE loan_id = $1 AND is_paid = FALSE
     ORDER BY charge_date ASC`,
    [loan_id]
  );
  let remaining = penaltyPortionPaid;
  for (const pc of unpaidPenalties.rows) {
    if (remaining >= parseFloat(pc.amount) - 0.01) {
      await client.query(
        'UPDATE penalty_charges SET is_paid = TRUE WHERE id = $1',
        [pc.id]
      );
      remaining -= parseFloat(pc.amount);
    } else {
      break;
    }
  }
}
    // Check remaining statuses
    const stillOverdue = await client.query(
      `SELECT COUNT(*) FROM payment_schedule
       WHERE loan_id = $1 AND status = 'overdue'`,
      [loan_id]
    );
    const stillPending = await client.query(
      `SELECT COUNT(*) FROM payment_schedule
       WHERE loan_id = $1 AND status = 'pending'`,
      [loan_id]
    );

    const overdueCount = parseInt(stillOverdue.rows[0].count);
    const pendingCount = parseInt(stillPending.rows[0].count);
    const totalPaidNow = alreadyPaid + amountPaid;
    const isFullyPaid = totalPaidNow >= totalPayable - 0.01 &&
      overdueCount === 0 && pendingCount === 0;

    if (isFullyPaid) {
      await client.query(
        'UPDATE loans SET status = $1 WHERE id = $2',
        ['paid', loan_id]
      );
      await client.query(
        `UPDATE payment_schedule SET status = 'paid'
         WHERE loan_id = $1 AND status IN ('pending','overdue')`,
        [loan_id]
      );
    } else if (overdueCount === 0) {
      await client.query(
        `UPDATE loans SET status = 'active' WHERE id = $1`,
        [loan_id]
      );
    } else {
      await client.query(
        `UPDATE loans SET status = 'overdue' WHERE id = $1`,
        [loan_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...paymentResult.rows[0],
      periods_covered: periodsToMark,
      loan_fully_paid: isFullyPaid,
      message: isFullyPaid
        ? 'Loan fully paid!'
        : `Payment recorded. Covered ${periodsToMark} period(s).`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

// GET /api/payments/penalty/:loanId
router.get('/penalty/:loanId', verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    const simDate = req.query.simDate || null;
    const today = simDate ? `'${simDate}'::date` : 'CURRENT_DATE';

    const settingsResult = await pool.query(
      'SELECT * FROM system_settings LIMIT 1'
    );
    const sysSettings = settingsResult.rows[0] || {
      penalty_rate: 2, grace_period: 3
    };
    const penaltyRate = parseFloat(sysSettings.penalty_rate) / 100;
    const gracePeriod = parseInt(sysSettings.grace_period);

    await pool.query(`
      UPDATE payment_schedule SET status = 'overdue'
      WHERE loan_id = $1 AND status = 'pending' AND due_date < ${today}
    `, [loanId]);

    const overdueResult = await pool.query(`
      SELECT *,
        (${today} - due_date)::integer AS days_overdue
      FROM payment_schedule
      WHERE loan_id = $1 AND status = 'overdue'
      ORDER BY due_date ASC
    `, [loanId]);

    let totalPenalty = 0;
    const breakdown = overdueResult.rows.map(period => {
      const daysOverdue = parseInt(period.days_overdue) || 0;
      const amountDue = parseFloat(period.amount_due);
      const penalty = daysOverdue > gracePeriod
        ? parseFloat((amountDue * penaltyRate).toFixed(2))
        : 0;
      totalPenalty += penalty;
      return {
        due_date: period.due_date,
        amount_due: amountDue,
        days_overdue: daysOverdue,
        penalty,
        within_grace: daysOverdue <= gracePeriod,
      };
    });

    res.json({
      loan_id: loanId,
      overdue_periods: breakdown.length,
      penalty_rate: `${sysSettings.penalty_rate}%`,
      grace_period_days: gracePeriod,
      penalty_breakdown: breakdown,
      total_penalty: parseFloat(totalPenalty.toFixed(2)),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;