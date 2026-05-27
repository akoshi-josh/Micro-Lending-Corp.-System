const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const verifyToken = require('../middleware/auth');

// GET /api/settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({
        default_rate: 5,
        default_frequency: 'monthly',
        penalty_rate: 2,
        grace_period: 3,
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/settings
router.put('/', verifyToken, async (req, res) => {
  const { default_rate, default_frequency, penalty_rate, grace_period } = req.body;
  try {
    const result = await pool.query(`
      UPDATE system_settings
      SET default_rate = $1,
          default_frequency = $2,
          penalty_rate = $3,
          grace_period = $4,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [default_rate, default_frequency, penalty_rate, grace_period]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;