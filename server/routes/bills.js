const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Generate unique bill number: BILL-YYYYMMDD-XXX
function generateBillNumber(dateStr) {
  const cleanDate = dateStr.replace(/-/g, '');
  const prefix = `BILL-${cleanDate}-`;

  const lastBill = db.prepare(`
    SELECT bill_number 
    FROM bills 
    WHERE bill_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSequence = 1;
  if (lastBill && lastBill.bill_number) {
    const parts = lastBill.bill_number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(3, '0')}`;
}

// GET /api/bills - list bills with filters
router.get('/', authenticateToken, (req, res) => {
  const { date_from, date_to, payment_status, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT b.*, 
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name,
           p.mobile_number as patient_mobile,
           a.appointment_number,
           d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           dept.department_name
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    JOIN appointments a ON b.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    WHERE 1=1
  `;
  const params = [];

  if (date_from) {
    query += ' AND b.bill_date >= ?';
    params.push(date_from);
  }

  if (date_to) {
    query += ' AND b.bill_date <= ?';
    params.push(date_to);
  }

  if (payment_status) {
    query += ' AND b.payment_status = ?';
    params.push(payment_status);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query += ` AND (
      b.bill_number LIKE ? 
      OR a.appointment_number LIKE ? 
      OR p.patient_registration_number LIKE ? 
      OR p.first_name LIKE ? 
      OR p.last_name LIKE ?
    )`;
    params.push(s, s, s, s, s);
  }

  const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
  const totalCount = db.prepare(countQuery).get(...params).count;

  query += ' ORDER BY b.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const bills = db.prepare(query).all(...params);

  res.json({
    bills,
    pagination: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    }
  });
});

// GET /api/bills/:id - single bill details
router.get('/:id', authenticateToken, (req, res) => {
  const bill = db.prepare(`
    SELECT b.*, 
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name,
           p.gender as patient_gender, p.age as patient_age, p.mobile_number as patient_mobile,
           p.address as patient_address, p.city as patient_city,
           a.appointment_number, a.appointment_date,
           d.doctor_code, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           d.specialization,
           dept.department_name,
           u.full_name as created_by_name
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    JOIN appointments a ON b.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  const payments = db.prepare('SELECT * FROM payments WHERE bill_id = ? ORDER BY payment_date ASC').all(bill.id);
  bill.payments = payments;

  res.json({ bill });
});

// POST /api/bills - Create a bill
router.post('/', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const {
    appointment_id,
    patient_id,
    consultation_fee,
    additional_charges = 0,
    discount = 0,
    bill_date
  } = req.body;

  if (!appointment_id) {
    return res.status(400).json({ error: 'Appointment ID is required.' });
  }

  const appointment = db.prepare(`
    SELECT a.*, d.consultation_fee as doc_fee 
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = ?
  `).get(appointment_id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  // Check if bill already exists for this appointment
  const existingBill = db.prepare('SELECT id, bill_number FROM bills WHERE appointment_id = ?').get(appointment_id);
  if (existingBill) {
    return res.status(400).json({ 
      error: `A bill (${existingBill.bill_number}) has already been generated for this appointment.` 
    });
  }

  const resolvedPatientId = patient_id || appointment.patient_id;
  const fee = consultation_fee !== undefined ? Number(consultation_fee) : Number(appointment.doc_fee);
  const addCharges = Number(additional_charges) || 0;
  const disc = Number(discount) || 0;
  const totalAmount = Math.max(0, fee + addCharges - disc);

  const dateStr = bill_date || new Date().toISOString().split('T')[0];
  const billNumber = generateBillNumber(dateStr);

  const consultation = db.prepare('SELECT id FROM consultations WHERE appointment_id = ?').get(appointment_id);
  const consultationId = consultation ? consultation.id : null;

  try {
    const result = db.prepare(`
      INSERT INTO bills (
        bill_number, patient_id, appointment_id, consultation_id,
        bill_date, consultation_fee, additional_charges, discount,
        total_amount, paid_amount, balance_amount, payment_status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'Pending', ?)
    `).run(
      billNumber, resolvedPatientId, appointment_id, consultationId,
      dateStr, fee, addCharges, disc, totalAmount, totalAmount, req.user.id
    );

    const createdBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Bill created successfully', bill: createdBill });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create bill.' });
  }
});

// PUT /api/bills/:id - Update bill charges / discount (only if not fully paid)
router.put('/:id', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const id = req.params.id;
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);

  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  if (bill.payment_status === 'Paid') {
    return res.status(400).json({ error: 'Cannot modify a bill that is already fully paid.' });
  }

  const { consultation_fee, additional_charges, discount } = req.body;

  const fee = consultation_fee !== undefined ? Number(consultation_fee) : bill.consultation_fee;
  const addCharges = additional_charges !== undefined ? Number(additional_charges) : bill.additional_charges;
  const disc = discount !== undefined ? Number(discount) : bill.discount;
  const totalAmount = Math.max(0, fee + addCharges - disc);

  if (totalAmount < bill.paid_amount) {
    return res.status(400).json({ 
      error: `New total amount (${totalAmount}) cannot be less than the already collected amount (${bill.paid_amount}).` 
    });
  }

  const balanceAmount = totalAmount - bill.paid_amount;
  const paymentStatus = balanceAmount === 0 ? 'Paid' : (bill.paid_amount > 0 ? 'Partially Paid' : 'Pending');

  db.prepare(`
    UPDATE bills SET
      consultation_fee = ?, additional_charges = ?, discount = ?,
      total_amount = ?, balance_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(fee, addCharges, disc, totalAmount, balanceAmount, paymentStatus, id);

  const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
  res.json({ message: 'Bill updated successfully', bill: updatedBill });
});

// GET /api/bills/:id/print - Full bill payload with hospital info
router.get('/:id/print', authenticateToken, (req, res) => {
  const bill = db.prepare(`
    SELECT b.*, 
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name,
           p.gender as patient_gender, p.age as patient_age, p.mobile_number as patient_mobile,
           p.address as patient_address, p.city as patient_city,
           a.appointment_number, a.appointment_date,
           d.doctor_code, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           d.specialization,
           dept.department_name,
           u.full_name as biller_name
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    JOIN appointments a ON b.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  bill.payments = db.prepare('SELECT * FROM payments WHERE bill_id = ? ORDER BY payment_date ASC').all(bill.id);

  const rawSettings = db.prepare('SELECT setting_key, setting_value FROM system_settings').all();
  const settings = {};
  for (const s of rawSettings) {
    settings[s.setting_key] = s.setting_value;
  }

  res.json({ bill, hospital: settings });
});

module.exports = router;
