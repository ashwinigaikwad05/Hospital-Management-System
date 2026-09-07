const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Generate unique receipt number: RCP-YYYYMMDD-XXX
function generateReceiptNumber() {
  const cleanDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `RCP-${cleanDate}-`;

  const lastPay = db.prepare(`
    SELECT receipt_number 
    FROM payments 
    WHERE receipt_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSequence = 1;
  if (lastPay && lastPay.receipt_number) {
    const parts = lastPay.receipt_number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(3, '0')}`;
}

// GET /api/payments - list all payments with filters
router.get('/', authenticateToken, (req, res) => {
  const { date_from, date_to, payment_method, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT pay.*, 
           b.bill_number, b.total_amount as bill_total, b.balance_amount as bill_balance,
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name,
           u.full_name as receiver_name
    FROM payments pay
    JOIN bills b ON pay.bill_id = b.id
    JOIN patients p ON b.patient_id = p.id
    LEFT JOIN users u ON pay.received_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (date_from) {
    query += ' AND DATE(pay.payment_date) >= ?';
    params.push(date_from);
  }

  if (date_to) {
    query += ' AND DATE(pay.payment_date) <= ?';
    params.push(date_to);
  }

  if (payment_method) {
    query += ' AND pay.payment_method = ?';
    params.push(payment_method);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query += ` AND (
      pay.receipt_number LIKE ? 
      OR b.bill_number LIKE ? 
      OR pay.transaction_reference LIKE ?
      OR p.patient_registration_number LIKE ?
      OR p.first_name LIKE ?
      OR p.last_name LIKE ?
    )`;
    params.push(s, s, s, s, s, s);
  }

  const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
  const totalCount = db.prepare(countQuery).get(...params).count;

  query += ' ORDER BY pay.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const payments = db.prepare(query).all(...params);

  res.json({
    payments,
    pagination: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    }
  });
});

// GET /api/payments/:id/receipt - Receipt printable payload
router.get('/:id/receipt', authenticateToken, (req, res) => {
  const payment = db.prepare(`
    SELECT pay.*, 
           b.bill_number, b.bill_date, b.consultation_fee, b.additional_charges, b.discount,
           b.total_amount as bill_total, b.paid_amount as bill_total_paid, b.balance_amount as bill_remaining_balance,
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name,
           p.gender as patient_gender, p.age as patient_age, p.mobile_number as patient_mobile,
           a.appointment_number,
           d.doctor_code, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           dept.department_name,
           u.full_name as receiver_name
    FROM payments pay
    JOIN bills b ON pay.bill_id = b.id
    JOIN patients p ON b.patient_id = p.id
    JOIN appointments a ON b.appointment_id = a.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    LEFT JOIN users u ON pay.received_by = u.id
    WHERE pay.id = ?
  `).get(req.params.id);

  if (!payment) {
    return res.status(404).json({ error: 'Payment receipt record not found.' });
  }

  const rawSettings = db.prepare('SELECT setting_key, setting_value FROM system_settings').all();
  const settings = {};
  for (const s of rawSettings) {
    settings[s.setting_key] = s.setting_value;
  }

  res.json({ receipt: payment, hospital: settings });
});

// POST /api/payments - Record a payment
router.post('/', authenticateToken, requireRole(['admin', 'receptionist']), (req, res) => {
  const {
    bill_id,
    amount,
    payment_method,
    transaction_reference
  } = req.body;

  if (!bill_id || !amount || !payment_method) {
    return res.status(400).json({ error: 'Bill ID, payment amount, and payment method are required.' });
  }

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be a positive number.' });
  }

  const validMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({ error: `Payment method must be one of: ${validMethods.join(', ')}` });
  }

  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill_id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  if (bill.payment_status === 'Paid' || bill.balance_amount <= 0) {
    return res.status(400).json({ error: 'This bill has already been fully paid.' });
  }

  if (payAmount > bill.balance_amount) {
    return res.status(400).json({ 
      error: `Payment amount (${payAmount}) exceeds the outstanding bill balance of ${bill.balance_amount}.` 
    });
  }

  try {
    db.exec('BEGIN TRANSACTION');

    const receiptNumber = generateReceiptNumber();
    const result = db.prepare(`
      INSERT INTO payments (
        receipt_number, bill_id, amount, payment_method,
        transaction_reference, payment_status, received_by
      ) VALUES (?, ?, ?, ?, ?, 'Success', ?)
    `).run(
      receiptNumber, bill_id, payAmount, payment_method,
      transaction_reference ? transaction_reference.trim() : null, req.user.id
    );

    const paymentId = Number(result.lastInsertRowid);

    // Update bill paid and balance amounts
    const newPaidAmount = bill.paid_amount + payAmount;
    const newBalanceAmount = Math.max(0, bill.total_amount - newPaidAmount);
    const newStatus = newBalanceAmount === 0 ? 'Paid' : 'Partially Paid';

    db.prepare(`
      UPDATE bills SET
        paid_amount = ?, balance_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPaidAmount, newBalanceAmount, newStatus, bill_id);

    db.exec('COMMIT');

    const paymentRecord = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: paymentRecord,
      bill: {
        id: bill_id,
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        payment_status: newStatus
      }
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to record payment.' });
  }
});

module.exports = router;
