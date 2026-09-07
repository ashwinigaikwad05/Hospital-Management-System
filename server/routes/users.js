const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes here are restricted to Admin
router.use(authenticateToken, requireRole(['admin']));

// GET /api/users - List all users
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.full_name, u.email, u.mobile_number, u.status, u.created_at,
           d.id as doctor_id, d.doctor_code, d.specialization, dept.department_name
    FROM users u
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN departments dept ON d.department_id = dept.id
    ORDER BY u.id ASC
  `).all();

  res.json({ users });
});

// POST /api/users - Create new user account
router.post('/', (req, res) => {
  const { username, password, role, full_name, email, mobile_number, status = 'active' } = req.body;

  if (!username || !password || !role || !full_name || !email) {
    return res.status(400).json({ error: 'Username, password, role, full name, and email are required.' });
  }

  if (!['admin', 'doctor', 'receptionist'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin', 'doctor', or 'receptionist'." });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (existingUser) {
    return res.status(400).json({ 
      error: `Username '${username.trim()}' is already taken by another account. Please choose a different username (e.g. ${role === 'doctor' ? 'dr.' + username.trim() : username.trim() + '1'}).` 
    });
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
  if (existingEmail) {
    return res.status(400).json({ 
      error: `Email '${email.trim()}' is already registered in the system. Please use a different email address.` 
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const cleanPhone = mobile_number ? mobile_number.replace(/\D/g, '').slice(0, 10) : null;

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, email, mobile_number, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username.trim(), passwordHash, role, full_name.trim(), email.trim(), cleanPhone, status);

  const newUser = db.prepare('SELECT id, username, role, full_name, email, mobile_number, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'User created successfully', user: newUser });
});

// PUT /api/users/:id - Update user details
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { full_name, email, mobile_number, role, status, password } = req.body;

  if (email && email.trim() !== current.email) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?').get(email.trim(), id);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already used by another account.' });
    }
  }

  let newPasswordHash = current.password_hash;
  if (password && password.trim()) {
    newPasswordHash = bcrypt.hashSync(password.trim(), 10);
  }

  db.prepare(`
    UPDATE users SET
      full_name = ?, email = ?, mobile_number = ?, role = ?, status = ?,
      password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    full_name ? full_name.trim() : current.full_name,
    email ? email.trim() : current.email,
    mobile_number !== undefined ? (mobile_number ? mobile_number.replace(/\D/g, '').slice(0, 10) : null) : current.mobile_number,
    role || current.role,
    status || current.status,
    newPasswordHash,
    id
  );

  const updated = db.prepare('SELECT id, username, role, full_name, email, mobile_number, status, updated_at FROM users WHERE id = ?').get(id);
  res.json({ message: 'User updated successfully', user: updated });
});

// DELETE /api/users/:id - Deactivate user
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  db.prepare("UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  res.json({ message: 'User account deactivated successfully.' });
});

module.exports = router;
