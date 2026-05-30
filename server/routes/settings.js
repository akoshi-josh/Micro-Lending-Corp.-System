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

// PUT /api/settings/credentials — change username or password
router.put('/credentials', verifyToken, async (req, res) => {
  const { type, current_username, new_username, current_password, new_password } = req.body;

  try {
    const adminResult = await pool.query('SELECT * FROM admin LIMIT 1');
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }
    const admin = adminResult.rows[0];

    if (type === 'username') {
      if (!current_username) {
        return res.status(400).json({ error: 'Current username is required.' });
      }
      if (admin.username !== current_username) {
        return res.status(401).json({ error: 'Current username is incorrect.' });
      }
      if (!new_username || new_username.length < 3) {
        return res.status(400).json({ error: 'New username must be at least 3 characters.' });
      }
      if (new_username === current_username) {
        return res.status(400).json({ error: 'New username must be different from current.' });
      }
      await pool.query('UPDATE admin SET username = $1 WHERE id = $2', [new_username, admin.id]);
      return res.json({ message: 'Username updated successfully.' });
    }

    if (type === 'password') {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(current_password, admin.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      const newHash = await bcrypt.hash(new_password, 10);
      await pool.query('UPDATE admin SET password_hash = $1 WHERE id = $2', [newHash, admin.id]);
      return res.json({ message: 'Password updated successfully.' });
    }

    return res.status(400).json({ error: 'Invalid type.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;