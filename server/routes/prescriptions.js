const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/prescriptions/:id - get prescription with medicines
router.get('/:id', authenticateToken, (req, res) => {
  const prescription = db.prepare(`
    SELECT pr.*, 
           p.first_name as patient_first_name, p.last_name as patient_last_name, 
           p.patient_registration_number, p.gender as patient_gender, p.age as patient_age,
           d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
           d.specialization, d.qualification, d.registration_number as doctor_reg_no,
           dept.department_name,
           c.blood_pressure, c.temperature, c.weight, c.height, c.symptoms, c.follow_up_date
    FROM prescriptions pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN doctors d ON pr.doctor_id = d.id
    JOIN departments dept ON d.department_id = dept.id
    JOIN consultations c ON pr.consultation_id = c.id
    WHERE pr.id = ?
  `).get(req.params.id);

  if (!prescription) {
    return res.status(404).json({ error: 'Prescription not found.' });
  }

  const medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescription.id);
  prescription.medicines = medicines;

  res.json({ prescription });
});

// GET /api/prescriptions/consultation/:consultation_id - get by consultation ID
router.get('/consultation/:consultation_id', authenticateToken, (req, res) => {
  const prescription = db.prepare('SELECT * FROM prescriptions WHERE consultation_id = ?').get(req.params.consultation_id);
  if (!prescription) {
    return res.status(404).json({ error: 'No prescription found for this consultation.' });
  }

  prescription.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescription.id);
  res.json({ prescription });
});

// POST /api/prescriptions - Create prescription with medicines array
router.post('/', authenticateToken, (req, res) => {
  const {
    consultation_id,
    patient_id,
    doctor_id,
    diagnosis,
    advice,
    medicines = []
  } = req.body;

  if (!consultation_id || !diagnosis) {
    return res.status(400).json({ error: 'Consultation ID and diagnosis are required.' });
  }

  const consultation = db.prepare('SELECT * FROM consultations WHERE id = ?').get(consultation_id);
  if (!consultation) {
    return res.status(404).json({ error: 'Consultation record not found.' });
  }

  const resolvedPatientId = patient_id || consultation.patient_id;
  const resolvedDoctorId = (req.user.role === 'doctor' && req.user.doctor_id) || doctor_id || consultation.doctor_id;
  const today = new Date().toISOString().split('T')[0];

  try {
    db.exec('BEGIN TRANSACTION');

    // Check if prescription already exists for this consultation
    const existing = db.prepare('SELECT id FROM prescriptions WHERE consultation_id = ?').get(consultation_id);
    let prescriptionId;

    if (existing) {
      prescriptionId = existing.id;
      db.prepare(`
        UPDATE prescriptions SET
          diagnosis = ?, advice = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(diagnosis.trim(), advice ? advice.trim() : null, prescriptionId);

      // Remove existing medicines to rewrite
      db.prepare('DELETE FROM prescription_medicines WHERE prescription_id = ?').run(prescriptionId);
    } else {
      const result = db.prepare(`
        INSERT INTO prescriptions (
          consultation_id, patient_id, doctor_id, prescription_date, diagnosis, advice
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        consultation_id, resolvedPatientId, resolvedDoctorId, today, diagnosis.trim(), advice ? advice.trim() : null
      );
      prescriptionId = Number(result.lastInsertRowid);
    }

    // Insert medicines
    const insertMed = db.prepare(`
      INSERT INTO prescription_medicines (
        prescription_id, medicine_name, strength, dosage, frequency, duration, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const med of medicines) {
      if (med.medicine_name && med.medicine_name.trim()) {
        insertMed.run(
          prescriptionId,
          med.medicine_name.trim(),
          med.strength ? med.strength.trim() : 'Standard',
          med.dosage ? med.dosage.trim() : '1 Unit',
          med.frequency ? med.frequency.trim() : 'Once daily',
          med.duration ? med.duration.trim() : '5 Days',
          med.instructions ? med.instructions.trim() : null
        );
      }
    }

    db.exec('COMMIT');

    const createdPrescription = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(prescriptionId);
    createdPrescription.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescriptionId);

    res.status(201).json({
      message: 'Prescription saved successfully',
      prescription: createdPrescription
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to save prescription.' });
  }
});

// GET /api/prescriptions/:id/print - Full payload for printing
router.get('/:id/print', authenticateToken, (req, res) => {
  const prescription = db.prepare(`
    SELECT pr.*, 
           p.first_name as patient_first_name, p.last_name as patient_last_name, 
           p.patient_registration_number, p.gender as patient_gender, p.age as patient_age,
           p.mobile_number as patient_mobile, p.blood_group,
           d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
           d.specialization, d.qualification, d.registration_number as doctor_reg_no,
           dept.department_name,
           c.blood_pressure, c.temperature, c.weight, c.height, c.symptoms, c.observations, c.follow_up_date,
           a.appointment_number
    FROM prescriptions pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN doctors d ON pr.doctor_id = d.id
    JOIN departments dept ON d.department_id = dept.id
    JOIN consultations c ON pr.consultation_id = c.id
    JOIN appointments a ON c.appointment_id = a.id
    WHERE pr.id = ?
  `).get(req.params.id);

  if (!prescription) {
    return res.status(404).json({ error: 'Prescription not found.' });
  }

  const medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescription.id);
  prescription.medicines = medicines;

  // Hospital settings
  const rawSettings = db.prepare('SELECT setting_key, setting_value FROM system_settings').all();
  const settings = {};
  for (const s of rawSettings) {
    settings[s.setting_key] = s.setting_value;
  }

  res.json({ prescription, hospital: settings });
});

module.exports = router;
