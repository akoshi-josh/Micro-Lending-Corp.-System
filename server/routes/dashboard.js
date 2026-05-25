const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    // Total active loans out
    const totalLoans = await pool.query(`
      SELECT COALESCE(SUM(loan_amount), 0) AS total
      FROM loans
    `);

    // Total collected from all payments
    const totalCollected = await pool.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM payments
    `);

    // Total interest earned from payments
    const interestEarned = await pool.query(`
      SELECT COALESCE(SUM(interest_collected), 0) AS total
      FROM payments
    `);

    // Total expenses from vouchers
    const totalExpenses = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM cash_vouchers
    `);

    const cashOnHand = parseFloat(totalCollected.rows[0].total) -
      parseFloat(totalExpenses.rows[0].total);

    // Overdue accounts
    const overdueAccounts = await pool.query(`
      SELECT
        b.full_name,
        b.contact_number,
        l.loan_amount,
        l.id AS loan_id,
        b.id AS borrower_id,
        ROUND(
          (l.loan_amount + (l.loan_amount * l.interest_rate / 100))
          - COALESCE(SUM(p.amount_paid), 0),
        2) AS remaining_balance
      FROM loans l
      JOIN borrowers b ON b.id = l.borrower_id
      LEFT JOIN payments p ON p.loan_id = l.id
      WHERE l.status = 'overdue'
      GROUP BY b.full_name, b.contact_number, l.loan_amount,
               l.interest_rate, l.id, b.id
      ORDER BY l.created_at DESC
      LIMIT 5
    `);

    // Recent payments
    const recentPayments = await pool.query(`
      SELECT p.*, b.full_name, l.payment_frequency
      FROM payments p
      JOIN borrowers b ON b.id = p.borrower_id
      JOIN loans l ON l.id = p.loan_id
      ORDER BY p.payment_date DESC
      LIMIT 5
    `);

    // Upcoming payments
// Upcoming payments — nearest due first
const upcomingPayments = await pool.query(`
  SELECT
    ps.due_date,
    ps.amount_due,
    ps.status,
    b.full_name,
    b.id AS borrower_id,
    l.payment_frequency,
    l.id AS loan_id,
    (ps.due_date - CURRENT_DATE) AS days_until_due
  FROM payment_schedule ps
  JOIN loans l ON l.id = ps.loan_id
  JOIN borrowers b ON b.id = l.borrower_id
  WHERE ps.status = 'pending'
    AND l.status != 'paid'
  ORDER BY ps.due_date ASC
  LIMIT 8
`);

    res.json({
      total_loans_out: totalLoans.rows[0].total,
      total_collected: totalCollected.rows[0].total,
      interest_earned: interestEarned.rows[0].total,
      cash_on_hand: cashOnHand,
      overdue_accounts: overdueAccounts.rows,
      recent_payments: recentPayments.rows,
      upcoming_payments: upcomingPayments.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;