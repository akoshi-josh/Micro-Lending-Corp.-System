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
          (COALESCE(l.loan_amount, 0) +
           (COALESCE(l.loan_amount, 0) * COALESCE(l.interest_rate, 0) / 100))
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
    const simDate = req.query.simDate || null;
    const today = simDate ? `'${simDate}'::date` : 'CURRENT_DATE';
    const todayStr = simDate || new Date().toISOString().split('T')[0];

    const borrowerResult = await pool.query(
      'SELECT * FROM borrowers WHERE id = $1', [id]
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
      SELECT p.*, l.loan_amount, l.interest_rate, l.payment_frequency
      FROM payments p
      JOIN loans l ON l.id = p.loan_id
      WHERE p.borrower_id = $1
      ORDER BY p.payment_date ASC, p.id ASC
    `, [id]);

    // Get settings
    const settingsResult = await pool.query(
      'SELECT * FROM system_settings LIMIT 1'
    );
    const sysSettings = settingsResult.rows[0] || {
      penalty_rate: 2, grace_period: 3
    };
    const penaltyRate = parseFloat(sysSettings.penalty_rate) / 100;
    const gracePeriod = parseInt(sysSettings.grace_period);

    if (loan && loan.status !== 'paid') {
      // Step 1: Mark overdue schedules
      await pool.query(`
        UPDATE payment_schedule
        SET status = 'overdue'
        WHERE loan_id = $1
          AND status = 'pending'
          AND due_date < ${today}
      `, [loan.id]);

      // Step 2: Get all overdue schedules
      const overdueSchedules = await pool.query(`
        SELECT *,
          (${today} - due_date)::integer AS days_overdue
        FROM payment_schedule
        WHERE loan_id = $1 AND status = 'overdue'
        ORDER BY due_date ASC
      `, [loan.id]);

      // Step 3: Create penalty charges for overdue periods that exceed grace
      for (const schedule of overdueSchedules.rows) {
        const daysOverdue = parseInt(schedule.days_overdue) || 0;
        if (daysOverdue > gracePeriod) {
          const existing = await pool.query(
            'SELECT id FROM penalty_charges WHERE schedule_id = $1',
            [schedule.id]
          );
          if (existing.rows.length === 0) {
            const penaltyAmount = parseFloat(
              (parseFloat(schedule.amount_due) * penaltyRate).toFixed(2)
            );
            await pool.query(`
              INSERT INTO penalty_charges
                (loan_id, borrower_id, schedule_id, amount, days_overdue, charge_date)
              VALUES ($1, $2, $3, $4, $5, ${today})
            `, [loan.id, id, schedule.id, penaltyAmount, daysOverdue]);
          }
        }
      }

      // Step 4: Update loan status
      const hasOverdue = overdueSchedules.rows.length > 0;
      if (hasOverdue) {
        await pool.query(
          `UPDATE loans SET status = 'overdue' WHERE id = $1 AND status != 'paid'`,
          [loan.id]
        );
      } else {
        await pool.query(
          `UPDATE loans SET status = 'active' WHERE id = $1 AND status = 'overdue'`,
          [loan.id]
        );
      }
    }

    // Get ALL penalty charges (paid and unpaid)
    const allPenaltyResult = await pool.query(`
      SELECT pc.*, ps.due_date, ps.amount_due, ps.status AS schedule_status,
        (${today} - ps.due_date)::integer AS days_overdue
      FROM penalty_charges pc
      JOIN payment_schedule ps ON ps.id = pc.schedule_id
      WHERE pc.loan_id = $1
      ORDER BY pc.charge_date ASC, pc.id ASC
    `, [loan?.id || 0]);

    const allPenalties = allPenaltyResult.rows;
    const unpaidPenalties = allPenalties.filter(p => !p.is_paid);
    const paidPenalties = allPenalties.filter(p => p.is_paid);

    const totalUnpaidPenalty = unpaidPenalties.reduce(
      (sum, p) => sum + parseFloat(p.amount), 0
    );
    const totalPaidPenalty = paidPenalties.reduce(
      (sum, p) => sum + parseFloat(p.amount), 0
    );
    const totalAllPenalty = parseFloat(
      (totalUnpaidPenalty + totalPaidPenalty).toFixed(2)
    );

    // Get overdue display info
    const overdueDisplayResult = await pool.query(`
      SELECT ps.*,
        (${today} - ps.due_date)::integer AS days_overdue,
        pc.amount AS penalty_amount,
        pc.is_paid AS penalty_is_paid,
        pc.id AS penalty_charge_id
      FROM payment_schedule ps
      LEFT JOIN penalty_charges pc ON pc.schedule_id = ps.id
      WHERE ps.loan_id = $1 AND ps.status = 'overdue'
      ORDER BY ps.due_date ASC
    `, [loan?.id || 0]);

    const penaltyData = {
      overdue_periods: overdueDisplayResult.rows.length,
      unpaid_penalty_count: unpaidPenalties.length,
      penalty_breakdown: overdueDisplayResult.rows.map(r => ({
        due_date: r.due_date,
        amount_due: parseFloat(r.amount_due),
        days_overdue: parseInt(r.days_overdue) || 0,
        penalty: parseFloat(r.penalty_amount || 0),
        within_grace: (parseInt(r.days_overdue) || 0) <= gracePeriod,
        penalty_paid: r.penalty_is_paid || false,
      })),
      total_unpaid_penalty: parseFloat(totalUnpaidPenalty.toFixed(2)),
      total_paid_penalty: parseFloat(totalPaidPenalty.toFixed(2)),
      total_penalty: parseFloat(totalUnpaidPenalty.toFixed(2)),
      penalty_rate: `${sysSettings.penalty_rate}%`,
      grace_period_days: gracePeriod,
    };

    // Base stats
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
        2) AS base_remaining
      FROM borrowers b
      LEFT JOIN loans l ON l.borrower_id = b.id
      LEFT JOIN payments p ON p.loan_id = l.id
      WHERE b.id = $1
      GROUP BY l.loan_amount, l.interest_rate, l.term_months
    `, [id]);

    const rawStats = statsResult.rows[0] || {
      loan_amount: 0, interest_rate: 0, term_months: 0,
      total_paid: 0, interest_earned: 0,
      total_payable: 0, base_remaining: 0
    };

// remaining = (total_payable - total_paid) + unpaid_penalties
// total_paid already includes penalty portions from payments
// so we recalculate base_remaining correctly
const totalPaidFromPayments = parseFloat(rawStats.total_paid);
const baseRemainingCalc = parseFloat(rawStats.total_payable) -
  totalPaidFromPayments;
const remainingBalance = baseRemainingCalc + totalUnpaidPenalty;

    const stats = {
      ...rawStats,
      remaining_balance: parseFloat(remainingBalance.toFixed(2)),
      total_payable_with_penalty: parseFloat(
        (parseFloat(rawStats.total_payable) + totalAllPenalty).toFixed(2)
      ),
      penalty: parseFloat(totalUnpaidPenalty.toFixed(2)),
    };

    // Next payment
    let nextPayment = null;
    let schedule = [];
    if (loan) {
      const nextResult = await pool.query(`
        SELECT due_date, amount_due, status
        FROM payment_schedule
        WHERE loan_id = $1 AND status IN ('pending','overdue')
        ORDER BY due_date ASC LIMIT 1
      `, [loan.id]);
      nextPayment = nextResult.rows[0] || null;

      const schedResult = await pool.query(`
        SELECT * FROM payment_schedule
        WHERE loan_id = $1 ORDER BY due_date ASC
      `, [loan.id]);
      schedule = schedResult.rows;
    }

    const finalLoans = await pool.query(
      'SELECT * FROM loans WHERE borrower_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      borrower: borrowerResult.rows[0],
      loans: finalLoans.rows,
      payments: paymentsResult.rows,
      stats,
      next_payment: nextPayment,
      schedule,
      penalty: penaltyData,
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