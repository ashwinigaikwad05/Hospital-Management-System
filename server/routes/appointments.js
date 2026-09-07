const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Generate daily appointment number: APT-YYYYMMDD-XXX
function generateAppointmentNumber(dateStr) {
  const cleanDate = dateStr.replace(/-/g, '');
  const prefix = `APT-${cleanDate}-`;

  const lastApt = db.prepare(`
    SELECT appointment_number 
    FROM appointments 
    WHERE appointment_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSequence = 1;
  if (lastApt && lastApt.appointment_number) {
    const parts = lastApt.appointment_number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(3, '0')}`;
}

// Generate daily doctor-wise token number (resets daily doctor-wise)
function getNextDoctorToken(doctorId, dateStr) {
  const result = db.prepare(`
    SELECT MAX(token_number) as max_token 
    FROM appointments 
    WHERE doctor_id = ? AND appointment_date = ?
  `).get(doctorId, dateStr);

  return (result && result.max_token) ? result.max_token + 1 : 1;
}

// GET /api/appointments - list with filters
router.get('/', authenticateToken, (req, res) => {
  const { date, doctor_id, department_id, status, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT a.*, 
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name, 
           p.gender as patient_gender, p.age as patient_age, p.mobile_number as patient_mobile,
           d.doctor_code, d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
           d.specialization, d.consultation_fee,
           dept.department_name,
           q.status as queue_status, q.id as queue_id
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    LEFT JOIN queues q ON a.id = q.appointment_id
    WHERE 1=1
  `;
  const params = [];

  // If role is doctor, restrict to their own appointments unless admin
  if (req.user.role === 'doctor') {
    query += ' AND a.doctor_id = ?';
    params.push(req.user.doctor_id);
  } else if (doctor_id) {
    query += ' AND a.doctor_id = ?';
    params.push(doctor_id);
  }

  if (date) {
    query += ' AND a.appointment_date = ?';
    params.push(date);
  }

  if (department_id) {
    query += ' AND a.department_id = ?';
    params.push(department_id);
  }

  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query += ` AND (
      a.appointment_number LIKE ? 
      OR p.patient_registration_number LIKE ? 
      OR p.first_name LIKE ? 
      OR p.last_name LIKE ? 
      OR p.mobile_number LIKE ?
    )`;
    params.push(s, s, s, s, s);
  }

  const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
  const totalCount = db.prepare(countQuery).get(...params).count;

  query += ' ORDER BY a.appointment_date DESC, a.token_number ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const appointments = db.prepare(query).all(...params);

  res.json({
    appointments,
    pagination: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    }
  });
});

// GET /api/appointments/:id - single appointment details
router.get('/:id', authenticateToken, (req, res) => {
  const appointment = db.prepare(`
    SELECT a.*, 
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name, 
           p.gender as patient_gender, p.date_of_birth, p.age as patient_age, p.mobile_number as patient_mobile,
           p.blood_group, p.address as patient_address, p.city as patient_city,
           d.doctor_code, d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
           d.specialization, d.qualification, d.consultation_fee,
           dept.department_name,
           q.id as queue_id, q.status as queue_status, q.called_at, q.started_at, q.completed_at,
           c.id as consultation_id, c.diagnosis, c.consultation_status,
           b.id as bill_id, b.bill_number, b.total_amount, b.paid_amount, b.balance_amount, b.payment_status as bill_payment_status
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    LEFT JOIN queues q ON a.id = q.appointment_id
    LEFT JOIN consultations c ON a.id = c.appointment_id
    LEFT JOIN bills b ON a.id = b.appointment_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  // If user is a doctor, verify appointment belongs to them
  if (req.user.role === 'doctor' && req.user.doctor_id !== appointment.doctor_id) {
    return res.status(403).json({ error: 'You do not have access to this appointment.' });
  }

  res.json({ appointment });
});

// POST /api/appointments - Book new appointment
router.post('/', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const {
    patient_id,
    department_id,
    doctor_id,
    appointment_date,
    appointment_time,
    appointment_type = 'New Visit',
    reason_for_visit,
    auto_check_in = false
  } = req.body;

  if (!patient_id || !department_id || !doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Patient, Department, Doctor, Date, and Time are required.' });
  }

  // Validate patient exists
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patient_id);
  if (!patient) {
    return res.status(400).json({ error: 'Patient record not found.' });
  }

  // Validate doctor belongs to selected department
  const doctor = db.prepare('SELECT id, status, consultation_fee FROM doctors WHERE id = ? AND department_id = ?').get(doctor_id, department_id);
  if (!doctor) {
    return res.status(400).json({ error: 'Doctor not found in the selected department.' });
  }

  if (doctor.status !== 'active') {
    return res.status(400).json({ error: 'The selected doctor is currently inactive.' });
  }

  // Prevent duplicate appointment for same patient with same doctor on same date (excluding cancelled)
  const existingApt = db.prepare(`
    SELECT id, appointment_number FROM appointments 
    WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ? AND status NOT IN ('Cancelled', 'No Show')
  `).get(patient_id, doctor_id, appointment_date);

  if (existingApt) {
    return res.status(400).json({ 
      error: `Patient already has an active appointment (${existingApt.appointment_number}) with this doctor on ${appointment_date}.` 
    });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    const appointmentNumber = generateAppointmentNumber(appointment_date);
    const tokenNumber = getNextDoctorToken(doctor_id, appointment_date);
    const initialStatus = auto_check_in ? 'Waiting' : 'Booked';

    const result = db.prepare(`
      INSERT INTO appointments (
        appointment_number, patient_id, department_id, doctor_id,
        appointment_date, appointment_time, token_number, appointment_type,
        status, reason_for_visit, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appointmentNumber, patient_id, department_id, doctor_id,
      appointment_date, appointment_time, tokenNumber, appointment_type,
      initialStatus, reason_for_visit ? reason_for_visit.trim() : null, req.user.id
    );

    const appointmentId = Number(result.lastInsertRowid);

    // If auto check in or status is Waiting, add to Queue table
    if (auto_check_in || initialStatus === 'Waiting') {
      db.prepare(`
        INSERT INTO queues (appointment_id, doctor_id, token_number, queue_date, status)
        VALUES (?, ?, ?, ?, 'Waiting')
      `).run(appointmentId, doctor_id, tokenNumber, appointment_date);
    }

    db.exec('COMMIT');

    const created = db.prepare(`
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
             d.first_name as doctor_first_name, d.last_name as doctor_last_name,
             dept.department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN departments dept ON a.department_id = dept.id
      WHERE a.id = ?
    `).get(appointmentId);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: created
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to book appointment.' });
  }
});

// PUT /api/appointments/:id/checkin - Mark patient as checked-in and enter queue
router.put('/:id/checkin', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const id = req.params.id;
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);

  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (apt.status === 'Cancelled') {
    return res.status(400).json({ error: 'Cannot check-in a cancelled appointment.' });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    // Update appointment status to Waiting
    db.prepare(`
      UPDATE appointments 
      SET status = 'Waiting', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    // Ensure queue entry exists
    const existingQueue = db.prepare('SELECT id FROM queues WHERE appointment_id = ?').get(id);
    if (!existingQueue) {
      db.prepare(`
        INSERT INTO queues (appointment_id, doctor_id, token_number, queue_date, status)
        VALUES (?, ?, ?, ?, 'Waiting')
      `).run(id, apt.doctor_id, apt.token_number, apt.appointment_date);
    } else {
      db.prepare(`
        UPDATE queues 
        SET status = 'Waiting', updated_at = CURRENT_TIMESTAMP 
        WHERE appointment_id = ?
      `).run(id);
    }

    db.exec('COMMIT');

    res.json({ message: `Patient marked as Checked-In. Assigned Token #${apt.token_number} in Doctor's queue.` });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to check-in patient.' });
  }
});

// PUT /api/appointments/:id/reschedule - Reschedule date/time
router.put('/:id/reschedule', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const id = req.params.id;
  const { appointment_date, appointment_time } = req.body;

  if (!appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'New appointment date and time are required.' });
  }

  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (['Completed', 'In Consultation'].includes(apt.status)) {
    return res.status(400).json({ error: `Cannot reschedule an appointment that is already ${apt.status}.` });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    // If date changed, calculate new token number for the doctor on that date
    let newTokenNumber = apt.token_number;
    if (appointment_date !== apt.appointment_date) {
      newTokenNumber = getNextDoctorToken(apt.doctor_id, appointment_date);
    }

    db.prepare(`
      UPDATE appointments SET
        appointment_date = ?,
        appointment_time = ?,
        token_number = ?,
        status = 'Booked',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(appointment_date, appointment_time, newTokenNumber, id);

    // Update queue if present
    db.prepare(`
      UPDATE queues SET
        queue_date = ?,
        token_number = ?,
        status = 'Waiting',
        updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = ?
    `).run(appointment_date, newTokenNumber, id);

    db.exec('COMMIT');

    res.json({ 
      message: `Appointment rescheduled to ${appointment_date} at ${appointment_time} (Token #${newTokenNumber}).`,
      token_number: newTokenNumber
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to reschedule appointment.' });
  }
});

// PUT /api/appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const id = req.params.id;
  const { cancellation_reason } = req.body;

  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  if (['Completed', 'In Consultation'].includes(apt.status)) {
    return res.status(400).json({ error: `Cannot cancel an appointment that is already ${apt.status}.` });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    db.prepare(`
      UPDATE appointments 
      SET status = 'Cancelled', reason_for_visit = COALESCE(?, reason_for_visit), updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(cancellation_reason ? `[CANCELLED: ${cancellation_reason}] ` + (apt.reason_for_visit || '') : null, id);

    // Delete or mark queue
    db.prepare('DELETE FROM queues WHERE appointment_id = ?').run(id);

    db.exec('COMMIT');

    res.json({ message: 'Appointment cancelled successfully.' });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to cancel appointment.' });
  }
});

module.exports = router;
