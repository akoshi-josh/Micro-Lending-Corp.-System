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
        ROUND(
          (COALESCE(l.loan_amount, 0) + (COALESCE(l.loan_amount, 0) * COALESCE(l.interest_rate, 0) / 100))
          - COALESCE(SUM(p.amount_paid), 0),
        2) AS remaining_balance
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

    const borrowerResult = await pool.query(
      'SELECT * FROM borrowers WHERE id = $1',
      [id]
    );

    if (borrowerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Borrower not found.' });
    }

    const loansResult = await pool.query(
      'SELECT * FROM loans WHERE borrower_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const loan = loansResult.rows[0];

    const paymentsResult = await pool.query(`
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

    const statsResult = await pool.query(`
      SELECT
        COALESCE(l.loan_amount, 0) AS loan_amount,
        COALESCE(l.interest_rate, 0) AS interest_rate,
        COALESCE(l.term_months, 0) AS term_months,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        COALESCE(SUM(p.interest_collected), 0) AS interest_earned,
        ROUND(
          COALESCE(l.loan_amount, 0) +
          (COALESCE(l.loan_amount, 0) * COALESCE(l.interest_rate, 0) / 100),
        2) AS total_payable,
        ROUND(
          (COALESCE(l.loan_amount, 0) +
          (COALESCE(l.loan_amount, 0) * COALESCE(l.interest_rate, 0) / 100))
          - COALESCE(SUM(p.amount_paid), 0),
        2) AS remaining_balance
      FROM borrowers b
      LEFT JOIN loans l ON l.borrower_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      WHERE b.id = $1
      GROUP BY l.loan_amount, l.interest_rate, l.term_months
    `, [id]);

    // Next payment due
    let nextPayment = null;
    let schedule = [];

    if (loan) {
      const nextPaymentResult = await pool.query(`
        SELECT due_date, amount_due, status
        FROM payment_schedule
        WHERE loan_id = $1 AND status = 'pending'
        ORDER BY due_date ASC
        LIMIT 1
      `, [loan.id]);
      nextPayment = nextPaymentResult.rows[0] || null;

      const scheduleResult = await pool.query(`
        SELECT *
        FROM payment_schedule
        WHERE loan_id = $1
        ORDER BY due_date ASC
      `, [loan.id]);
      schedule = scheduleResult.rows;
    }

    res.json({
      borrower: borrowerResult.rows[0],
      loans: loansResult.rows,
      payments: paymentsResult.rows,
      stats: statsResult.rows[0] || {
        loan_amount: 0,
        interest_rate: 0,
        term_months: 0,
        total_paid: 0,
        interest_earned: 0,
        total_payable: 0,
        remaining_balance: 0
      },
      next_payment: nextPayment,
      schedule,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/borrowers
router.post('/', verifyToken, async (req, res) => {
  const {
    full_name, contact_number, address, id_type, id_number,
    age, sex, civil_status, date_of_birth, place_of_birth,
    sss_id_number, spouse_name, spouse_dob, spouse_sss,
    co_maker, relationship_to_borrower, type_of_pension,
    bus_address, bank, acct_number, pin
  } = req.body;

  if (!full_name) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO borrowers (
        full_name, contact_number, address, id_type, id_number,
        age, sex, civil_status, date_of_birth, place_of_birth,
        sss_id_number, spouse_name, spouse_dob, spouse_sss,
        co_maker, relationship_to_borrower, type_of_pension,
        bus_address, bank, acct_number, pin
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      ) RETURNING *`,
      [
        full_name, contact_number, address, id_type, id_number,
        age, sex, civil_status, date_of_birth || null, place_of_birth,
        sss_id_number, spouse_name, spouse_dob || null, spouse_sss,
        co_maker, relationship_to_borrower, type_of_pension,
        bus_address, bank, acct_number, pin
      ]
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
  const {
    full_name, contact_number, address, id_type, id_number,
    age, sex, civil_status, date_of_birth, place_of_birth,
    sss_id_number, spouse_name, spouse_dob, spouse_sss,
    co_maker, relationship_to_borrower, type_of_pension,
    bus_address, bank, acct_number, pin
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE borrowers SET
        full_name=$1, contact_number=$2, address=$3,
        id_type=$4, id_number=$5, age=$6, sex=$7,
        civil_status=$8, date_of_birth=$9, place_of_birth=$10,
        sss_id_number=$11, spouse_name=$12, spouse_dob=$13,
        spouse_sss=$14, co_maker=$15, relationship_to_borrower=$16,
        type_of_pension=$17, bus_address=$18, bank=$19,
        acct_number=$20, pin=$21
      WHERE id=$22 RETURNING *`,
      [
        full_name, contact_number, address, id_type, id_number,
        age, sex, civil_status, date_of_birth || null, place_of_birth,
        sss_id_number, spouse_name, spouse_dob || null, spouse_sss,
        co_maker, relationship_to_borrower, type_of_pension,
        bus_address, bank, acct_number, pin, id
      ]
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