const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/borrowers
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.*,
        l.id AS loan_id,
        l.loan_amount,
        l.interest_rate,
        l.payment_frequency,
        l.term_months,
        l.status AS loan_status,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        l.loan_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining_balance
      FROM borrowers b
      LEFT JOIN loans l ON l.borrower_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      GROUP BY b.id, l.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/borrowers/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const borrower = await pool.query(
      'SELECT * FROM borrowers WHERE id = $1',
      [id]
    );

    if (borrower.rows.length === 0) {
      return res.status(404).json({ error: 'Borrower not found.' });
    }

    const loans = await pool.query(
      'SELECT * FROM loans WHERE borrower_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const payments = await pool.query(`
      SELECT
        p.*,
        l.loan_amount,
        l.interest_rate,
        l.payment_frequency
      FROM payments p
      JOIN loans l ON l.id = p.loan_id
      WHERE p.borrower_id = $1
      ORDER BY p.payment_date DESC
    `, [id]);

    const stats = await pool.query(`
      SELECT
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        COALESCE(SUM(p.interest_collected), 0) AS interest_earned,
        COALESCE(l.loan_amount, 0) AS loan_amount,
        COALESCE(l.loan_amount, 0) - COALESCE(SUM(p.amount_paid), 0) AS remaining_balance
      FROM borrowers b
      LEFT JOIN loans l ON l.borrower_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      WHERE b.id = $1
      GROUP BY l.loan_amount
    `, [id]);

    res.json({
      borrower: borrower.rows[0],
      loans: loans.rows,
      payments: payments.rows,
      stats: stats.rows[0] || {
        total_paid: 0,
        interest_earned: 0,
        loan_amount: 0,
        remaining_balance: 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/borrowers
router.post('/', verifyToken, async (req, res) => {
  const { full_name, contact_number, address, id_type, id_number } = req.body;

  if (!full_name) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO borrowers (full_name, contact_number, address, id_type, id_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [full_name, contact_number, address, id_type, id_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/borrowers/:id
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { full_name, contact_number, address, id_type, id_number } = req.body;

  try {
    const result = await pool.query(
      `UPDATE borrowers
       SET full_name=$1, contact_number=$2, address=$3, id_type=$4, id_number=$5
       WHERE id=$6 RETURNING *`,
      [full_name, contact_number, address, id_type, id_number, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Borrower not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;