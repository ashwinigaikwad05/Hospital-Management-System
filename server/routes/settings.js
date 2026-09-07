const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/settings - Get all hospital settings (accessible to all authenticated users for receipts/prescriptions)
router.get('/', authenticateToken, (req, res) => {
  const settingsRows = db.prepare('SELECT setting_key, setting_value FROM system_settings').all();
  const settings = {};
  for (const s of settingsRows) {
    settings[s.setting_key] = s.setting_value;
  }
  res.json({ settings });
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const updates = req.body; // e.g. { hospital_name: '...', address: '...', ... }

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Settings object is required.' });
  }

  const upsert = db.prepare(`
    INSERT INTO system_settings (setting_key, setting_value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(setting_key) DO UPDATE SET 
      setting_value = excluded.setting_value,
      updated_at = CURRENT_TIMESTAMP
  `);

  try {
    db.exec('BEGIN TRANSACTION');
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && val !== null) {
        upsert.run(key, String(val));
      }
    }
    db.exec('COMMIT');

    const settingsRows = db.prepare('SELECT setting_key, setting_value FROM system_settings').all();
    const settings = {};
    for (const s of settingsRows) {
      settings[s.setting_key] = s.setting_value;
    }

    res.json({ message: 'Hospital settings saved successfully', settings });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to update settings.' });
  }
});

module.exports = router;
