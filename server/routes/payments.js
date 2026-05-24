const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/payments
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, b.full_name, l.loan_amount, l.interest_rate
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
  const { loan_id, borrower_id, amount_paid, interest_collected, payment_date, notes } = req.body;

  if (!loan_id || !borrower_id || !amount_paid || !payment_date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `INSERT INTO payments (loan_id, borrower_id, amount_paid, interest_collected, payment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [loan_id, borrower_id, amount_paid, interest_collected || 0, payment_date, notes]
    );

    // Mark next pending schedule as paid
    const nextSchedule = await client.query(
      `SELECT id FROM payment_schedule
       WHERE loan_id = $1 AND status = 'pending'
       ORDER BY due_date ASC LIMIT 1`,
      [loan_id]
    );

    if (nextSchedule.rows.length > 0) {
      await client.query(
        `UPDATE payment_schedule SET status = 'paid' WHERE id = $1`,
        [nextSchedule.rows[0].id]
      );
    }

    // Check if all schedules are paid
    const remaining = await client.query(
      `SELECT COUNT(*) FROM payment_schedule WHERE loan_id = $1 AND status = 'pending'`,
      [loan_id]
    );

    if (parseInt(remaining.rows[0].count) === 0) {
      await client.query(
        `UPDATE loans SET status = 'paid' WHERE id = $1`,
        [loan_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

module.exports = router;