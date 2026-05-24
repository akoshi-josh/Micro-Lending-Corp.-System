const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/ledger/general
router.get('/general', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = `
      SELECT * FROM general_ledger
      WHERE 1=1
    `;
    const params = [];

    if (month && year) {
      params.push(year, month);
      query += ` AND EXTRACT(YEAR FROM transaction_date) = $1
                 AND EXTRACT(MONTH FROM transaction_date) = $2`;
    }

    query += ' ORDER BY transaction_date ASC';

    const result = await pool.query(query, params);

    // Compute running balance
    let balance = 0;
    const rows = result.rows.map(row => {
      balance += parseFloat(row.debit) - parseFloat(row.credit);
      return { ...row, running_balance: balance };
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/ledger/subsidiary
router.get('/subsidiary', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id AS borrower_id,
        b.full_name,
        b.contact_number,
        l.id AS loan_id,
        l.loan_amount,
        l.interest_rate,
        l.payment_frequency,
        l.status,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        COALESCE(SUM(p.interest_collected), 0) AS interest_earned,
        l.loan_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining_balance
      FROM borrowers b
      LEFT JOIN loans l ON l.borrower_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      GROUP BY b.id, l.id
      ORDER BY b.full_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/ledger/interest
router.get('/interest', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM interest_ledger');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/ledger/accounts
router.get('/accounts', verifyToken, async (req, res) => {
  try {
    const cashOnHand = await pool.query(`
      SELECT
        COALESCE(SUM(p.amount_paid), 0) AS total_in,
        COALESCE((SELECT SUM(amount) FROM cash_vouchers), 0) AS total_out
      FROM payments p
    `);

    const receivables = await pool.query(`
      SELECT
        b.full_name,
        l.loan_amount,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        l.loan_amount - COALESCE(SUM(p.amount_paid), 0) AS outstanding,
        l.status
      FROM loans l
      JOIN borrowers b ON b.id = l.borrower_id
      LEFT JOIN payments p ON p.loan_id = l.id
      WHERE l.status != 'paid'
      GROUP BY b.full_name, l.loan_amount, l.status
    `);

    const expenses = await pool.query(`
      SELECT ec.name AS category, COALESCE(SUM(cv.amount), 0) AS total
      FROM expense_categories ec
      LEFT JOIN cash_vouchers cv ON cv.category_id = ec.id
      GROUP BY ec.name
    `);

    res.json({
      cash_on_hand: cashOnHand.rows[0],
      receivables: receivables.rows,
      expenses: expenses.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;