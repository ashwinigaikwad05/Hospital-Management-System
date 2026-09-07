const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Your account is deactivated. Please contact the administrator.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  let doctorProfile = null;
  if (user.role === 'doctor') {
    doctorProfile = db.prepare(`
      SELECT d.id as doctor_id, d.*, dept.department_name 
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.user_id = ?
    `).get(user.id);
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

  const { password_hash, ...safeUser } = user;

  res.json({
    message: 'Login successful',
    token,
    user: {
      ...safeUser,
      doctor: doctorProfile || null
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  let doctorProfile = null;
  if (req.user.role === 'doctor') {
    doctorProfile = db.prepare(`
      SELECT d.id as doctor_id, d.*, dept.department_name 
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.user_id = ?
    `).get(req.user.id);
  }

  res.json({
    user: {
      ...req.user,
      doctor: doctorProfile || null
    }
  });
});

module.exports = router;
