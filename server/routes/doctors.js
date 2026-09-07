const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/doctors - list doctors (optional filter by department_id and status)
router.get('/', authenticateToken, (req, res) => {
  const { department_id, status } = req.query;

  let query = `
    SELECT d.*, dept.department_name, u.username
    FROM doctors d
    LEFT JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN users u ON d.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (department_id && department_id !== 'undefined' && department_id !== 'null' && String(department_id).trim() !== '') {
    query += ' AND d.department_id = ?';
    params.push(department_id);
  }

  if (status && status !== 'undefined' && status !== 'null' && String(status).trim() !== '') {
    query += ' AND d.status = ?';
    params.push(status);
  } else if (req.user.role !== 'admin') {
    query += " AND d.status = 'active'";
  }

  query += ' ORDER BY d.first_name ASC, d.last_name ASC';

  const doctors = db.prepare(query).all(...params);
  res.json({ doctors });
});

// GET /api/doctors/:id - get single doctor details
router.get('/:id', authenticateToken, (req, res) => {
  const doctor = db.prepare(`
    SELECT d.*, dept.department_name, u.username
    FROM doctors d
    LEFT JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN users u ON d.user_id = u.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // Doctor stats
  const totalAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ?').get(doctor.id).count;
  const completedConsultations = db.prepare('SELECT COUNT(*) as count FROM consultations WHERE doctor_id = ?').get(doctor.id).count;
  const todayAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = CURRENT_DATE').get(doctor.id).count;

  res.json({
    doctor,
    stats: {
      totalAppointments,
      completedConsultations,
      todayAppointments
    }
  });
});

// POST /api/doctors (Admin only) - create doctor and optionally generate login account
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const {
    doctor_code,
    first_name,
    last_name,
    gender,
    mobile_number,
    email,
    department_id,
    specialization,
    qualification,
    experience = 0,
    consultation_fee = 0,
    registration_number,
    status = 'active',
    create_user_account = true,
    username,
    password
  } = req.body;

  if (!doctor_code || !first_name || !last_name || !mobile_number || !email || !department_id || !specialization || !qualification || !registration_number) {
    return res.status(400).json({ error: 'All primary doctor details and medical registration number are required.' });
  }

  // Check department exists
  const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(department_id);
  if (!dept) {
    return res.status(400).json({ error: 'Selected department does not exist.' });
  }

  // Check doctor code & registration number uniqueness
  const existingCode = db.prepare('SELECT id FROM doctors WHERE doctor_code = ? COLLATE NOCASE').get(doctor_code.trim());
  if (existingCode) {
    return res.status(400).json({ error: 'Doctor Code is already registered.' });
  }

  const existingReg = db.prepare('SELECT id FROM doctors WHERE registration_number = ? COLLATE NOCASE').get(registration_number.trim());
  if (existingReg) {
    return res.status(400).json({ error: 'Medical Registration Number is already assigned to another doctor.' });
  }

  let userId = null;

  try {
    db.exec('BEGIN TRANSACTION');

    if (create_user_account) {
      const loginUser = username ? username.trim() : `dr.${first_name.toLowerCase()}`;
      const loginPass = password || 'doctor123';

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(loginUser);
      if (existingUser) {
        throw new Error(`Username '${loginUser}' already exists. Please provide a unique username.`);
      }

      const passwordHash = bcrypt.hashSync(loginPass, 10);
      const cleanMobile = mobile_number ? mobile_number.replace(/\D/g, '').slice(0, 10) : '';

      const userRes = db.prepare(`
        INSERT INTO users (username, password_hash, role, full_name, email, mobile_number, status)
        VALUES (?, ?, 'doctor', ?, ?, ?, ?)
      `).run(loginUser, passwordHash, `Dr. ${first_name.trim()} ${last_name.trim()}`, email.trim(), cleanMobile, status);

      userId = Number(userRes.lastInsertRowid);
    }

    const cleanMobile = mobile_number ? mobile_number.replace(/\D/g, '').slice(0, 10) : '';

    const docRes = db.prepare(`
      INSERT INTO doctors (
        user_id, doctor_code, first_name, last_name, gender, mobile_number, email,
        department_id, specialization, qualification, experience, consultation_fee,
        registration_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, doctor_code.trim().toUpperCase(), first_name.trim(), last_name.trim(), gender || 'Male',
      cleanMobile, email.trim(), department_id, specialization.trim(), qualification.trim(),
      Number(experience), Number(consultation_fee), registration_number.trim(), status
    );

    db.exec('COMMIT');

    const createdDoctor = db.prepare(`
      SELECT d.*, dept.department_name, u.username
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `).get(docRes.lastInsertRowid);

    res.status(201).json({ message: 'Doctor created successfully', doctor: createdDoctor });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: err.message || 'Failed to create doctor.' });
  }
});

// PUT /api/doctors/:id (Admin or Doctor updating their own profile)
router.put('/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  const current = db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  // Doctor can only update their own profile; Admin can update any doctor
  if (req.user.role === 'doctor' && req.user.doctor_id !== Number(id)) {
    return res.status(403).json({ error: 'You are only permitted to update your own profile.' });
  }

  const {
    first_name,
    last_name,
    gender,
    mobile_number,
    email,
    department_id,
    specialization,
    qualification,
    experience,
    consultation_fee,
    registration_number,
    status
  } = req.body;

  // If changing doctor code or registration number, ensure uniqueness
  if (registration_number && registration_number.trim() !== current.registration_number) {
    const existing = db.prepare('SELECT id FROM doctors WHERE registration_number = ? COLLATE NOCASE AND id != ?').get(registration_number.trim(), id);
    if (existing) {
      return res.status(400).json({ error: 'Medical Registration Number already in use by another doctor.' });
    }
  }

  // Admin only can change fee and status
  const feeToSet = (req.user.role === 'admin' && consultation_fee !== undefined) ? Number(consultation_fee) : current.consultation_fee;
  const statusToSet = (req.user.role === 'admin' && status) ? status : current.status;
  const deptToSet = (req.user.role === 'admin' && department_id) ? department_id : current.department_id;

  db.prepare(`
    UPDATE doctors SET
      first_name = ?, last_name = ?, gender = ?, mobile_number = ?, email = ?,
      department_id = ?, specialization = ?, qualification = ?, experience = ?,
      consultation_fee = ?, registration_number = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    first_name ? first_name.trim() : current.first_name,
    last_name ? last_name.trim() : current.last_name,
    gender || current.gender,
    mobile_number ? mobile_number.replace(/\D/g, '').slice(0, 10) : current.mobile_number,
    email ? email.trim() : current.email,
    deptToSet,
    specialization ? specialization.trim() : current.specialization,
    qualification ? qualification.trim() : current.qualification,
    experience !== undefined ? Number(experience) : current.experience,
    feeToSet,
    registration_number ? registration_number.trim() : current.registration_number,
    statusToSet,
    id
  );

  const updated = db.prepare(`
    SELECT d.*, dept.department_name, u.username
    FROM doctors d
    LEFT JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN users u ON d.user_id = u.id
    WHERE d.id = ?
  `).get(id);

  res.json({ message: 'Doctor profile updated successfully', doctor: updated });
});

module.exports = router;
