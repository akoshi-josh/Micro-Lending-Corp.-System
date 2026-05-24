const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/loans
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.*,
        b.full_name,
        b.contact_number,
        COALESCE(SUM(p.amount_paid), 0) AS total_paid,
        l.loan_amount - COALESCE(SUM(p.amount_paid), 0) AS remaining_balance
      FROM loans l
      JOIN borrowers b ON b.id = l.borrower_id
      LEFT JOIN payments p ON p.loan_id = l.id
      GROUP BY l.id, b.full_name, b.contact_number
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/loans/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await pool.query(`
      SELECT l.*, b.full_name, b.contact_number, b.address
      FROM loans l
      JOIN borrowers b ON b.id = l.borrower_id
      WHERE l.id = $1
    `, [id]);

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    const schedule = await pool.query(
      'SELECT * FROM payment_schedule WHERE loan_id = $1 ORDER BY due_date ASC',
      [id]
    );

    res.json({ loan: loan.rows[0], schedule: schedule.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/loans
router.post('/', verifyToken, async (req, res) => {
  const {
    borrower_id, loan_amount, interest_rate,
    payment_frequency, term_months, release_date, purpose
  } = req.body;

  if (!borrower_id || !loan_amount || !interest_rate || !payment_frequency || !term_months || !release_date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const loanResult = await client.query(
      `INSERT INTO loans (borrower_id, loan_amount, interest_rate, payment_frequency, term_months, release_date, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING *`,
      [borrower_id, loan_amount, interest_rate, payment_frequency, term_months, release_date, purpose]
    );

    const loan = loanResult.rows[0];
    const loanId = loan.id;

    // Calculate monthly payment
    const monthly = (parseFloat(loan_amount) / parseInt(term_months)) +
      (parseFloat(loan_amount) * parseFloat(interest_rate) / 100);

    // Generate payment schedule
    const scheduleEntries = [];
    const releaseDate = new Date(release_date);

    if (payment_frequency === 'monthly') {
      for (let i = 1; i <= term_months; i++) {
        const dueDate = new Date(releaseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        scheduleEntries.push({ due_date: dueDate, amount_due: monthly });
      }
    } else if (payment_frequency === 'semi_monthly') {
      const perPeriod = monthly / 2;
      const totalPeriods = term_months * 2;
      for (let i = 1; i <= totalPeriods; i++) {
        const dueDate = new Date(releaseDate);
        dueDate.setDate(dueDate.getDate() + (i * 15));
        scheduleEntries.push({ due_date: dueDate, amount_due: perPeriod });
      }
    } else if (payment_frequency === 'weekly') {
      const perPeriod = monthly / 4;
      const totalPeriods = term_months * 4;
      for (let i = 1; i <= totalPeriods; i++) {
        const dueDate = new Date(releaseDate);
        dueDate.setDate(dueDate.getDate() + (i * 7));
        scheduleEntries.push({ due_date: dueDate, amount_due: perPeriod });
      }
    }

    for (const entry of scheduleEntries) {
      await client.query(
        `INSERT INTO payment_schedule (loan_id, due_date, amount_due, status)
         VALUES ($1, $2, $3, 'pending')`,
        [loanId, entry.due_date, entry.amount_due.toFixed(2)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ loan, schedule: scheduleEntries });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

// PUT /api/loans/:id/status
router.put('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE loans SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;