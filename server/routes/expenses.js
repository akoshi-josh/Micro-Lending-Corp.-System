const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/expenses
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

// GET /api/expenses/categories
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM expense_categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;