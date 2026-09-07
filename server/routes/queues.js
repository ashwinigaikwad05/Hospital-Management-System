const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/queues/today - get queue state for today
router.get('/today', authenticateToken, (req, res) => {
  const { doctor_id, date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  let targetDoctorId = doctor_id;
  if (req.user.role === 'doctor') {
    targetDoctorId = req.user.doctor_id;
  }

  let query = `
    SELECT q.*, 
           a.appointment_number, a.appointment_type, a.reason_for_visit, a.appointment_time,
           p.id as patient_id, p.patient_registration_number, p.first_name as patient_first_name, 
           p.last_name as patient_last_name, p.gender as patient_gender, p.age as patient_age, 
           p.mobile_number as patient_mobile, p.blood_group,
           d.id as doctor_id, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           d.specialization, dept.department_name,
           c.id as consultation_id
    FROM queues q
    JOIN appointments a ON q.appointment_id = a.id
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON q.doctor_id = d.id
    JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN consultations c ON a.id = c.appointment_id
    WHERE q.queue_date = ?
  `;
  const params = [targetDate];

  if (targetDoctorId) {
    query += ' AND q.doctor_id = ?';
    params.push(targetDoctorId);
  }

  query += ' ORDER BY q.token_number ASC';

  const queueItems = db.prepare(query).all(...params);

  // Classify queues
  const waiting = queueItems.filter(item => item.status === 'Waiting');
  const called = queueItems.filter(item => item.status === 'Called');
  const inConsultation = queueItems.filter(item => item.status === 'In Consultation');
  const skipped = queueItems.filter(item => item.status === 'Skipped');
  const completed = queueItems.filter(item => item.status === 'Completed');

  // Find currently active patient (in consultation or called)
  const current = inConsultation[0] || called[0] || null;
  // Next in line
  const next = waiting[0] || null;

  res.json({
    date: targetDate,
    stats: {
      total: queueItems.length,
      waitingCount: waiting.length,
      calledCount: called.length,
      inConsultationCount: inConsultation.length,
      skippedCount: skipped.length,
      completedCount: completed.length
    },
    current,
    next,
    waiting,
    called,
    inConsultation,
    skipped,
    completed,
    all: queueItems
  });
});

// POST /api/queues/call-next - Call the next waiting patient
router.post('/call-next', authenticateToken, (req, res) => {
  let { doctor_id } = req.body;
  if (req.user.role === 'doctor') {
    doctor_id = req.user.doctor_id;
  }

  if (!doctor_id) {
    return res.status(400).json({ error: 'Doctor ID is required.' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Find next waiting patient
  const nextItem = db.prepare(`
    SELECT * FROM queues 
    WHERE doctor_id = ? AND queue_date = ? AND status = 'Waiting'
    ORDER BY token_number ASC LIMIT 1
  `).get(doctor_id, today);

  if (!nextItem) {
    return res.status(404).json({ error: 'No waiting patients found in queue for this doctor today.' });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE queues 
      SET status = 'Called', called_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nowStr, nextItem.id);

    db.prepare(`
      UPDATE appointments 
      SET status = 'Waiting', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(nextItem.appointment_id);

    db.exec('COMMIT');

    const updated = db.prepare(`
      SELECT q.*, p.first_name, p.last_name, p.patient_registration_number, a.appointment_number
      FROM queues q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE q.id = ?
    `).get(nextItem.id);

    res.json({ message: `Token #${nextItem.token_number} called.`, queue: updated });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to call next patient.' });
  }
});

// POST /api/queues/start/:id - Start consultation for a queue item
router.post('/start/:id', authenticateToken, (req, res) => {
  const queueId = req.params.id;
  const queueItem = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);

  if (!queueItem) {
    return res.status(404).json({ error: 'Queue record not found.' });
  }

  if (req.user.role === 'doctor' && req.user.doctor_id !== queueItem.doctor_id) {
    return res.status(403).json({ error: 'You cannot start consultation for another doctor.' });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE queues 
      SET status = 'In Consultation', started_at = COALESCE(started_at, ?), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nowStr, queueId);

    db.prepare(`
      UPDATE appointments 
      SET status = 'In Consultation', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(queueItem.appointment_id);

    db.exec('COMMIT');

    res.json({ message: `Consultation started for Token #${queueItem.token_number}.` });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to start consultation.' });
  }
});

// POST /api/queues/skip/:id - Skip patient
router.post('/skip/:id', authenticateToken, (req, res) => {
  const queueId = req.params.id;
  const queueItem = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);

  if (!queueItem) {
    return res.status(404).json({ error: 'Queue record not found.' });
  }

  if (req.user.role === 'doctor' && req.user.doctor_id !== queueItem.doctor_id) {
    return res.status(403).json({ error: 'You cannot manage queue for another doctor.' });
  }

  db.prepare(`
    UPDATE queues 
    SET status = 'Skipped', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(queueId);

  res.json({ message: `Token #${queueItem.token_number} marked as Skipped.` });
});

// POST /api/queues/requeue/:id - Put skipped patient back into waiting
router.post('/requeue/:id', authenticateToken, (req, res) => {
  const queueId = req.params.id;
  const queueItem = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);

  if (!queueItem) {
    return res.status(404).json({ error: 'Queue record not found.' });
  }

  db.prepare(`
    UPDATE queues 
    SET status = 'Waiting', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(queueId);

  res.json({ message: `Token #${queueItem.token_number} returned to Waiting queue.` });
});

// POST /api/queues/complete/:id - Complete consultation from queue
router.post('/complete/:id', authenticateToken, (req, res) => {
  const queueId = req.params.id;
  const queueItem = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);

  if (!queueItem) {
    return res.status(404).json({ error: 'Queue record not found.' });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE queues 
      SET status = 'Completed', completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nowStr, queueId);

    db.prepare(`
      UPDATE appointments 
      SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(queueItem.appointment_id);

    db.exec('COMMIT');

    res.json({ message: `Token #${queueItem.token_number} consultation marked as Completed.` });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to complete queue.' });
  }
});

module.exports = router;
