const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/consultations/appointment/:appointment_id - get consultation for appointment
router.get('/appointment/:appointment_id', authenticateToken, (req, res) => {
  const consult = db.prepare(`
    SELECT c.*, 
           p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_registration_number,
           d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization
    FROM consultations c
    JOIN patients p ON c.patient_id = p.id
    JOIN doctors d ON c.doctor_id = d.id
    WHERE c.appointment_id = ?
  `).get(req.params.appointment_id);

  if (!consult) {
    return res.status(404).json({ error: 'No consultation found for this appointment.' });
  }

  // Fetch linked prescription and medicines
  const prescription = db.prepare('SELECT * FROM prescriptions WHERE consultation_id = ?').get(consult.id);
  if (prescription) {
    prescription.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescription.id);
    consult.prescription = prescription;
  }

  res.json({ consultation: consult });
});

// GET /api/consultations/patient/:patient_id - get all past consultations for a patient
router.get('/patient/:patient_id', authenticateToken, (req, res) => {
  const consultations = db.prepare(`
    SELECT c.*, 
           a.appointment_number, a.appointment_date,
           d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.specialization,
           dept.department_name
    FROM consultations c
    JOIN appointments a ON c.appointment_id = a.id
    JOIN doctors d ON c.doctor_id = d.id
    JOIN departments dept ON d.department_id = dept.id
    WHERE c.patient_id = ?
    ORDER BY c.created_at DESC
  `).all(req.params.patient_id);

  for (const c of consultations) {
    const prescription = db.prepare('SELECT * FROM prescriptions WHERE consultation_id = ?').get(c.id);
    if (prescription) {
      prescription.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescription.id);
      c.prescription = prescription;
    }
  }

  res.json({ consultations });
});

// POST /api/consultations - Create or complete consultation
router.post('/', authenticateToken, (req, res) => {
  let {
    appointment_id,
    patient_id,
    doctor_id,
    symptoms,
    observations,
    diagnosis,
    blood_pressure,
    temperature,
    weight,
    height,
    advice,
    follow_up_date,
    consultation_status = 'Completed'
  } = req.body;

  if (req.user.role === 'doctor') {
    doctor_id = req.user.doctor_id;
  }

  if (!appointment_id || !diagnosis || !symptoms) {
    return res.status(400).json({ error: 'Appointment ID, symptoms, and diagnosis are required.' });
  }

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointment_id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  const resolvedPatientId = patient_id || appointment.patient_id;
  const resolvedDoctorId = doctor_id || appointment.doctor_id;

  try {
    db.exec('BEGIN TRANSACTION');

    // Check if consultation already exists for this appointment
    const existing = db.prepare('SELECT id FROM consultations WHERE appointment_id = ?').get(appointment_id);
    let consultationId;

    if (existing) {
      consultationId = existing.id;
      db.prepare(`
        UPDATE consultations SET
          symptoms = ?, observations = ?, diagnosis = ?,
          blood_pressure = ?, temperature = ?, weight = ?, height = ?,
          advice = ?, follow_up_date = ?, consultation_status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        symptoms.trim(), observations ? observations.trim() : null, diagnosis.trim(),
        blood_pressure || null, temperature || null,
        weight ? Number(weight) : null, height ? Number(height) : null,
        advice ? advice.trim() : null, follow_up_date || null,
        consultation_status, consultationId
      );
    } else {
      const result = db.prepare(`
        INSERT INTO consultations (
          appointment_id, patient_id, doctor_id,
          symptoms, observations, diagnosis,
          blood_pressure, temperature, weight, height,
          advice, follow_up_date, consultation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        appointment_id, resolvedPatientId, resolvedDoctorId,
        symptoms.trim(), observations ? observations.trim() : null, diagnosis.trim(),
        blood_pressure || null, temperature || null,
        weight ? Number(weight) : null, height ? Number(height) : null,
        advice ? advice.trim() : null, follow_up_date || null,
        consultation_status
      );
      consultationId = Number(result.lastInsertRowid);
    }

    // If completed, update appointment & queue
    if (consultation_status === 'Completed') {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      db.prepare(`
        UPDATE appointments 
        SET status = 'Completed', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(appointment_id);

      db.prepare(`
        UPDATE queues 
        SET status = 'Completed', completed_at = COALESCE(completed_at, ?), updated_at = CURRENT_TIMESTAMP 
        WHERE appointment_id = ?
      `).run(nowStr, appointment_id);

      // Also ensure bill exists or create initial bill draft
      const existingBill = db.prepare('SELECT id FROM bills WHERE appointment_id = ?').get(appointment_id);
      if (!existingBill) {
        const doctor = db.prepare('SELECT consultation_fee FROM doctors WHERE id = ?').get(resolvedDoctorId);
        const fee = doctor ? doctor.consultation_fee : 500.00;
        const cleanDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const billNumber = `BILL-${cleanDate}-${String(appointment_id).padStart(3, '0')}`;

        db.prepare(`
          INSERT INTO bills (
            bill_number, patient_id, appointment_id, consultation_id,
            bill_date, consultation_fee, additional_charges, discount,
            total_amount, paid_amount, balance_amount, payment_status, created_by
          ) VALUES (?, ?, ?, ?, CURRENT_DATE, ?, 0.00, 0.00, ?, 0.00, ?, 'Pending', ?)
        `).run(billNumber, resolvedPatientId, appointment_id, consultationId, fee, fee, fee, req.user.id);
      }
    }

    db.exec('COMMIT');

    const created = db.prepare('SELECT * FROM consultations WHERE id = ?').get(consultationId);
    res.status(201).json({
      message: 'Consultation saved successfully',
      consultation: created
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to save consultation.' });
  }
});

module.exports = router;
