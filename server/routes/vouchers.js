const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/vouchers
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cv.*, ec.name AS category_name
      FROM cash_vouchers cv
      LEFT JOIN expense_categories ec ON ec.id = cv.category_id
      ORDER BY cv.voucher_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/vouchers/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cv.*, ec.name AS category_name
      FROM cash_vouchers cv
      LEFT JOIN expense_categories ec ON ec.id = cv.category_id
      WHERE cv.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/vouchers
router.post('/', verifyToken, async (req, res) => {
  const { voucher_number, payable_to, category_id, description, amount, voucher_date, approved_by } = req.body;

  if (!voucher_number || !payable_to || !amount || !voucher_date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO cash_vouchers (voucher_number, payable_to, category_id, description, amount, voucher_date, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [voucher_number, payable_to, category_id, description, amount, voucher_date, approved_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;