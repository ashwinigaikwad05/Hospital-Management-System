const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper to calculate age from birth date string (YYYY-MM-DD)
function calculateAge(dobString) {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// Generate unique sequential registration number: PAT-YYYY-XXXX
function generateRegistrationNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `PAT-${currentYear}-`;

  const lastPatient = db.prepare(`
    SELECT patient_registration_number 
    FROM patients 
    WHERE patient_registration_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSequence = 1;
  if (lastPatient && lastPatient.patient_registration_number) {
    const parts = lastPatient.patient_registration_number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

// GET /api/patients - search and list patients
router.get('/', authenticateToken, (req, res) => {
  const { search, limit = 50, page = 1 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT * FROM patients WHERE 1=1';
  const params = [];

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query += ` AND (
      patient_registration_number LIKE ? 
      OR first_name LIKE ? 
      OR last_name LIKE ? 
      OR mobile_number LIKE ? 
      OR email LIKE ?
    )`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
  const totalCount = db.prepare(countQuery).get(...params).count;

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const patients = db.prepare(query).all(...params);

  res.json({
    patients,
    pagination: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    }
  });
});

// GET /api/patients/:id - get patient details with complete medical history
router.get('/:id', authenticateToken, (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  // Fetch all appointments
  const appointments = db.prepare(`
    SELECT a.*, d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
           d.specialization, dept.department_name
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN departments dept ON a.department_id = dept.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `).all(patient.id);

  // Fetch all consultations
  const consultations = db.prepare(`
    SELECT c.*, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           a.appointment_number
    FROM consultations c
    LEFT JOIN doctors d ON c.doctor_id = d.id
    LEFT JOIN appointments a ON c.appointment_id = a.id
    WHERE c.patient_id = ?
    ORDER BY c.created_at DESC
  `).all(patient.id);

  // For each consultation, fetch prescription medicines
  for (const consult of consultations) {
    const prescription = db.prepare('SELECT * FROM prescriptions WHERE consultation_id = ?').get(consult.id);
    if (prescription) {
      prescription.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(prescription.id);
      consult.prescription = prescription;
    }
  }

  // Fetch all bills and payment status
  const bills = db.prepare(`
    SELECT b.*, a.appointment_number
    FROM bills b
    LEFT JOIN appointments a ON b.appointment_id = a.id
    WHERE b.patient_id = ?
    ORDER BY b.created_at DESC
  `).all(patient.id);

  res.json({
    patient,
    appointments,
    consultations,
    bills
  });
});

// POST /api/patients - Register new patient
router.post('/', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    gender,
    date_of_birth,
    age,
    mobile_number,
    alternate_mobile_number,
    email,
    address,
    city,
    state,
    pincode,
    blood_group,
    emergency_contact_name,
    emergency_contact_number
  } = req.body;

  if (!first_name || !last_name || !mobile_number || !date_of_birth || !address || !city || !state || !pincode) {
    return res.status(400).json({ error: 'Please fill in all mandatory patient fields: name, DOB, phone, address, city, state, and pincode.' });
  }

  // Phone validation (exactly 10 digits)
  const cleanPhone = mobile_number.trim().replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile phone number.' });
  }

  const cleanAltPhone = alternate_mobile_number ? alternate_mobile_number.trim().replace(/\D/g, '') : null;
  if (cleanAltPhone && cleanAltPhone.length !== 10) {
    return res.status(400).json({ error: 'Alternate mobile number must be exactly 10 digits.' });
  }

  const cleanEmergencyPhone = emergency_contact_number ? emergency_contact_number.trim().replace(/\D/g, '') : null;
  if (cleanEmergencyPhone && cleanEmergencyPhone.length !== 10) {
    return res.status(400).json({ error: 'Emergency contact number must be exactly 10 digits.' });
  }

  // Check duplicate patient by name + phone
  const duplicate = db.prepare(`
    SELECT id, patient_registration_number FROM patients 
    WHERE mobile_number = ? AND LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
  `).get(cleanPhone, first_name.trim(), last_name.trim());

  if (duplicate) {
    return res.status(400).json({ 
      error: `Patient already registered with registration number ${duplicate.patient_registration_number}.` 
    });
  }

  const calculatedAge = age ? Number(age) : calculateAge(date_of_birth);
  const registrationNumber = generateRegistrationNumber();

  try {
    const result = db.prepare(`
      INSERT INTO patients (
        patient_registration_number, first_name, middle_name, last_name, gender,
        date_of_birth, age, mobile_number, alternate_mobile_number, email,
        address, city, state, pincode, blood_group,
        emergency_contact_name, emergency_contact_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      registrationNumber,
      first_name.trim(),
      middle_name ? middle_name.trim() : null,
      last_name.trim(),
      gender || 'Other',
      date_of_birth,
      calculatedAge,
      cleanPhone,
      cleanAltPhone,
      email ? email.trim() : null,
      address.trim(),
      city.trim(),
      state.trim(),
      pincode.trim(),
      blood_group || null,
      emergency_contact_name ? emergency_contact_name.trim() : null,
      cleanEmergencyPhone
    );

    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ 
      message: 'Patient registered successfully', 
      patient: newPatient 
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error creating patient.' });
  }
});

// PUT /api/patients/:id - Update patient info
router.put('/:id', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const id = req.params.id;
  const current = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const {
    first_name,
    middle_name,
    last_name,
    gender,
    date_of_birth,
    age,
    mobile_number,
    alternate_mobile_number,
    email,
    address,
    city,
    state,
    pincode,
    blood_group,
    emergency_contact_name,
    emergency_contact_number
  } = req.body;

  const calculatedAge = age ? Number(age) : (date_of_birth ? calculateAge(date_of_birth) : current.age);

  db.prepare(`
    UPDATE patients SET
      first_name = ?, middle_name = ?, last_name = ?, gender = ?,
      date_of_birth = ?, age = ?, mobile_number = ?, alternate_mobile_number = ?,
      email = ?, address = ?, city = ?, state = ?, pincode = ?,
      blood_group = ?, emergency_contact_name = ?, emergency_contact_number = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    first_name ? first_name.trim() : current.first_name,
    middle_name !== undefined ? (middle_name ? middle_name.trim() : null) : current.middle_name,
    last_name ? last_name.trim() : current.last_name,
    gender || current.gender,
    date_of_birth || current.date_of_birth,
    calculatedAge,
    mobile_number ? mobile_number.replace(/\D/g, '').slice(0, 10) : current.mobile_number,
    alternate_mobile_number !== undefined ? (alternate_mobile_number ? alternate_mobile_number.replace(/\D/g, '').slice(0, 10) : null) : current.alternate_mobile_number,
    email !== undefined ? email : current.email,
    address ? address.trim() : current.address,
    city ? city.trim() : current.city,
    state ? state.trim() : current.state,
    pincode ? pincode.trim() : current.pincode,
    blood_group || current.blood_group,
    emergency_contact_name !== undefined ? emergency_contact_name : current.emergency_contact_name,
    emergency_contact_number !== undefined ? (emergency_contact_number ? emergency_contact_number.replace(/\D/g, '').slice(0, 10) : null) : current.emergency_contact_number,
    id
  );

  const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  res.json({ message: 'Patient information updated successfully', patient: updated });
});

// DELETE /api/patients/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const id = req.params.id;
  
  const aptCount = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?').get(id).count;
  if (aptCount > 0) {
    return res.status(400).json({ error: `Cannot delete patient with ${aptCount} existing appointment record(s).` });
  }

  db.prepare('DELETE FROM patients WHERE id = ?').run(id);
  res.json({ message: 'Patient record deleted successfully.' });
});

module.exports = router;
