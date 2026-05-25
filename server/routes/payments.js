const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/payments
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, b.full_name, l.loan_amount, l.interest_rate, l.payment_frequency
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

    // Get loan details
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [loan_id]
    );
    const loan = loanResult.rows[0];

    if (!loan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found.' });
    }

    // Get total periods
    const scheduleResult = await client.query(
      'SELECT COUNT(*) FROM payment_schedule WHERE loan_id = $1',
      [loan_id]
    );
    const totalPeriods = parseInt(scheduleResult.rows[0].count) || 1;

    // Total interest for the whole loan
    const totalInterest = parseFloat(loan.loan_amount) *
      (parseFloat(loan.interest_rate) / 100);

    // Total payable
    const totalPayable = parseFloat(loan.loan_amount) + totalInterest;

    // How much has already been paid
    const alreadyPaidResult = await client.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS paid
       FROM payments WHERE loan_id = $1`,
      [loan_id]
    );
    const alreadyPaid = parseFloat(alreadyPaidResult.rows[0].paid);
    const remainingBalance = totalPayable - alreadyPaid;

    const amountPaid = parseFloat(amount_paid);

    // Safety check — cannot pay more than remaining
    if (amountPaid > remainingBalance + 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Payment of ₱${amountPaid.toFixed(2)} exceeds remaining balance of ₱${remainingBalance.toFixed(2)}.`
      });
    }

    // Interest per period
    const interestPerPeriod = totalInterest / totalPeriods;

    // How many periods does this payment cover?
    // Get pending schedules ordered by due date
    const pendingSchedules = await client.query(
      `SELECT * FROM payment_schedule
       WHERE loan_id = $1 AND status = 'pending'
       ORDER BY due_date ASC`,
      [loan_id]
    );

    let remainingPayment = amountPaid;
    let periodsToMark = 0;

    for (const schedule of pendingSchedules.rows) {
      const due = parseFloat(schedule.amount_due);
      if (remainingPayment >= due - 0.01) {
        remainingPayment -= due;
        periodsToMark++;
      } else if (remainingPayment > 0) {
        // Partial payment on a period — still count it
        periodsToMark++;
        break;
      } else {
        break;
      }
    }

    // Interest collected proportional to amount paid
    const interestCollected = Math.min(
      interestPerPeriod * Math.max(periodsToMark, 1),
      totalInterest,
      amountPaid
    );

    // Save the payment
    const paymentResult = await client.query(
      `INSERT INTO payments
        (loan_id, borrower_id, amount_paid, interest_collected, payment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        loan_id,
        borrower_id,
        amountPaid,
        parseFloat(interestCollected.toFixed(2)),
        payment_date,
        notes || null
      ]
    );

    // Mark the correct number of schedules as paid
    let marked = 0;
    let leftover = amountPaid;

    for (const schedule of pendingSchedules.rows) {
      if (marked >= periodsToMark) break;
      const due = parseFloat(schedule.amount_due);

      if (leftover >= due - 0.01) {
        // Full period covered
        await client.query(
          'UPDATE payment_schedule SET status = $1 WHERE id = $2',
          ['paid', schedule.id]
        );
        leftover -= due;
        marked++;
      } else if (leftover > 0) {
        // Partial — still mark as paid since borrower paid something
        await client.query(
          'UPDATE payment_schedule SET status = $1 WHERE id = $2',
          ['paid', schedule.id]
        );
        marked++;
        break;
      }
    }

    // Check if loan is fully paid
    const stillPending = await client.query(
      `SELECT COUNT(*) FROM payment_schedule
       WHERE loan_id = $1 AND status = 'pending'`,
      [loan_id]
    );

    // Also check by total amount paid
    const totalPaidNow = alreadyPaid + amountPaid;
    const isFullyPaid = totalPaidNow >= totalPayable - 0.01 ||
      parseInt(stillPending.rows[0].count) === 0;

    if (isFullyPaid) {
      await client.query(
        'UPDATE loans SET status = $1 WHERE id = $2',
        ['paid', loan_id]
      );
      // Mark all remaining schedules as paid too
      await client.query(
        `UPDATE payment_schedule SET status = 'paid'
         WHERE loan_id = $1 AND status = 'pending'`,
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

module.exports = router;