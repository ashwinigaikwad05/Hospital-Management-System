const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/dashboard - Role-tailored dashboard metrics
router.get('/dashboard', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  if (req.user.role === 'admin') {
    const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
    const todayPatients = db.prepare('SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = ?').get(today).count;
    const totalDoctors = db.prepare("SELECT COUNT(*) as count FROM doctors WHERE status = 'active'").get().count;
    const totalDepartments = db.prepare("SELECT COUNT(*) as count FROM departments WHERE status = 'active'").get().count;

    const todayAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?').get(today).count;
    const pendingAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status IN ('Booked', 'Waiting')").get(today).count;
    const completedAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status = 'Completed'").get(today).count;
    const cancelledAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status = 'Cancelled'").get(today).count;

    const patientsWaiting = db.prepare("SELECT COUNT(*) as count FROM queues WHERE queue_date = ? AND status = 'Waiting'").get(today).count;

    const todayRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(payment_date) = ?').get(today).total;
    const pendingRevenue = db.prepare("SELECT COALESCE(SUM(balance_amount), 0) as total FROM bills WHERE payment_status IN ('Pending', 'Partially Paid')").get().total;

    // Doctor-wise appointment count for today
    const doctorWiseSummary = db.prepare(`
      SELECT d.id, d.first_name, d.last_name, d.specialization, dept.department_name,
             COUNT(a.id) as total_appointments,
             SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) as completed,
             SUM(CASE WHEN a.status = 'Waiting' THEN 1 ELSE 0 END) as waiting
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN appointments a ON d.id = a.doctor_id AND a.appointment_date = ?
      WHERE d.status = 'active'
      GROUP BY d.id
      ORDER BY total_appointments DESC
    `).all(today);

    // Recent 5 appointments
    const recentAppointments = db.prepare(`
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
             d.first_name as doctor_first_name, d.last_name as doctor_last_name,
             dept.department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN departments dept ON a.department_id = dept.id
      ORDER BY a.created_at DESC LIMIT 5
    `).all();

    // Recent 5 patients
    const recentPatients = db.prepare('SELECT * FROM patients ORDER BY id DESC LIMIT 5').all();

    return res.json({
      role: 'admin',
      stats: {
        totalPatients,
        todayPatients,
        totalDoctors,
        totalDepartments,
        todayAppointments,
        pendingAppointments,
        completedAppointments,
        cancelledAppointments,
        patientsWaiting,
        todayRevenue,
        pendingRevenue
      },
      doctorWiseSummary,
      recentAppointments,
      recentPatients
    });
  }

  if (req.user.role === 'doctor') {
    const doctorId = req.user.doctor_id;

    const todayAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = ?').get(doctorId, today).count;
    const waitingPatients = db.prepare("SELECT COUNT(*) as count FROM queues WHERE doctor_id = ? AND queue_date = ? AND status = 'Waiting'").get(doctorId, today).count;
    const completedConsultations = db.prepare("SELECT COUNT(*) as count FROM consultations c JOIN appointments a ON c.appointment_id = a.id WHERE a.doctor_id = ? AND DATE(c.created_at) = ?").get(doctorId, today).count;

    const currentQueueItem = db.prepare(`
      SELECT q.*, p.id as patient_id, p.first_name, p.last_name, p.patient_registration_number, p.gender, p.age,
             a.appointment_number, a.reason_for_visit
      FROM queues q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE q.doctor_id = ? AND q.queue_date = ? AND q.status = 'In Consultation'
      LIMIT 1
    `).get(doctorId, today);

    const nextQueueItem = db.prepare(`
      SELECT q.*, p.id as patient_id, p.first_name, p.last_name, p.patient_registration_number,
             a.appointment_number
      FROM queues q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE q.doctor_id = ? AND q.queue_date = ? AND q.status = 'Waiting'
      ORDER BY q.token_number ASC LIMIT 1
    `).get(doctorId, today);

    const todayList = db.prepare(`
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
             p.patient_registration_number, p.age as patient_age, p.gender as patient_gender,
             q.status as queue_status, q.id as queue_id
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN queues q ON a.id = q.appointment_id
      WHERE a.doctor_id = ? AND a.appointment_date = ?
      ORDER BY a.token_number ASC
    `).all(doctorId, today);

    return res.json({
      role: 'doctor',
      stats: {
        todayAppointments,
        waitingPatients,
        completedConsultations
      },
      currentPatient: currentQueueItem || null,
      nextPatient: nextQueueItem || null,
      todayAppointments: todayList
    });
  }

  if (req.user.role === 'receptionist') {
    const todayRegistrations = db.prepare('SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = ?').get(today).count;
    const todayAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?').get(today).count;
    const waitingPatients = db.prepare("SELECT COUNT(*) as count FROM queues WHERE queue_date = ? AND status = 'Waiting'").get(today).count;
    const pendingPayments = db.prepare("SELECT COALESCE(SUM(balance_amount), 0) as total FROM bills WHERE payment_status IN ('Pending', 'Partially Paid')").get().total;

    const todayQueueSummary = db.prepare(`
      SELECT d.id as doctor_id, d.first_name, d.last_name, dept.department_name,
             COUNT(q.id) as total_tokens,
             SUM(CASE WHEN q.status = 'Waiting' THEN 1 ELSE 0 END) as waiting,
             SUM(CASE WHEN q.status = 'In Consultation' THEN 1 ELSE 0 END) as in_consultation,
             SUM(CASE WHEN q.status = 'Completed' THEN 1 ELSE 0 END) as completed
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN queues q ON d.id = q.doctor_id AND q.queue_date = ?
      WHERE d.status = 'active'
      GROUP BY d.id
    `).all(today);

    return res.json({
      role: 'receptionist',
      stats: {
        todayRegistrations,
        todayAppointments,
        waitingPatients,
        pendingPayments
      },
      todayQueueSummary
    });
  }
});

// GET /api/reports/patients - Patient registration and demographics report
router.get('/patients', authenticateToken, (req, res) => {
  const { date_from, date_to } = req.query;

  let query = 'SELECT * FROM patients WHERE 1=1';
  const params = [];

  if (date_from) {
    query += ' AND DATE(created_at) >= ?';
    params.push(date_from);
  }
  if (date_to) {
    query += ' AND DATE(created_at) <= ?';
    params.push(date_to);
  }

  query += ' ORDER BY created_at DESC';
  const patients = db.prepare(query).all(...params);

  // Groupings
  let filterSql = 'WHERE 1=1';
  const filterParams = [];
  if (date_from) {
    filterSql += ' AND DATE(created_at) >= ?';
    filterParams.push(date_from);
  }
  if (date_to) {
    filterSql += ' AND DATE(created_at) <= ?';
    filterParams.push(date_to);
  }

  const genderBreakdown = db.prepare(`
    SELECT gender, COUNT(*) as count 
    FROM patients 
    ${filterSql}
    GROUP BY gender
  `).all(...filterParams);

  const bloodGroupBreakdown = db.prepare(`
    SELECT blood_group, COUNT(*) as count 
    FROM patients 
    ${filterSql} AND blood_group IS NOT NULL
    GROUP BY blood_group
  `).all(...filterParams);

  res.json({
    total: patients.length,
    patients,
    genderBreakdown,
    bloodGroupBreakdown
  });
});

// GET /api/reports/appointments - Detailed appointments report
router.get('/appointments', authenticateToken, (req, res) => {
  const { date_from, date_to, doctor_id, department_id, status } = req.query;

  let query = `
    SELECT a.*, 
           p.patient_registration_number, p.first_name as patient_first_name, p.last_name as patient_last_name,
           p.mobile_number as patient_mobile,
           d.doctor_code, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
           dept.department_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN departments dept ON a.department_id = dept.id
    WHERE 1=1
  `;
  const params = [];

  if (date_from) {
    query += ' AND a.appointment_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    query += ' AND a.appointment_date <= ?';
    params.push(date_to);
  }
  if (doctor_id) {
    query += ' AND a.doctor_id = ?';
    params.push(doctor_id);
  }
  if (department_id) {
    query += ' AND a.department_id = ?';
    params.push(department_id);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }

  query += ' ORDER BY a.appointment_date DESC, a.token_number ASC';
  const appointments = db.prepare(query).all(...params);

  // Status breakdown
  const statusStats = {};
  for (const a of appointments) {
    statusStats[a.status] = (statusStats[a.status] || 0) + 1;
  }

  res.json({
    total: appointments.length,
    statusStats,
    appointments
  });
});

// GET /api/reports/doctors - Doctor workload & consultations report
router.get('/doctors', authenticateToken, (req, res) => {
  const { date_from, date_to } = req.query;

  let dateFilter = '';
  const params = [];
  if (date_from) {
    dateFilter += ' AND a.appointment_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    dateFilter += ' AND a.appointment_date <= ?';
    params.push(date_to);
  }

  const query = `
    SELECT d.id, d.doctor_code, d.first_name, d.last_name, d.specialization, d.consultation_fee,
           dept.department_name,
           COUNT(a.id) as total_appointments,
           SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) as completed_appointments,
           SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
           COUNT(c.id) as total_consultations,
           COALESCE(SUM(b.total_amount), 0) as total_billed_amount,
           COALESCE(SUM(b.paid_amount), 0) as total_collected_amount
    FROM doctors d
    JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN appointments a ON d.id = a.doctor_id ${dateFilter}
    LEFT JOIN consultations c ON a.id = c.appointment_id
    LEFT JOIN bills b ON a.id = b.appointment_id
    GROUP BY d.id
    ORDER BY total_appointments DESC
  `;

  const doctorReports = db.prepare(query).all(...params);
  res.json({ doctorReports });
});

// GET /api/reports/revenue - Financial revenue report
router.get('/revenue', authenticateToken, (req, res) => {
  const { date_from, date_to } = req.query;

  let payFilter = 'WHERE 1=1';
  const payParams = [];

  if (date_from) {
    payFilter += ' AND DATE(pay.payment_date) >= ?';
    payParams.push(date_from);
  }
  if (date_to) {
    payFilter += ' AND DATE(pay.payment_date) <= ?';
    payParams.push(date_to);
  }

  // Payment method breakdown
  const methodQuery = `
    SELECT pay.payment_method, COUNT(pay.id) as transaction_count, COALESCE(SUM(pay.amount), 0) as total_amount
    FROM payments pay
    ${payFilter}
    GROUP BY pay.payment_method
  `;
  const paymentMethods = db.prepare(methodQuery).all(...payParams);

  // Daily revenue trend
  const trendQuery = `
    SELECT DATE(pay.payment_date) as date, COUNT(pay.id) as transaction_count, COALESCE(SUM(pay.amount), 0) as daily_total
    FROM payments pay
    ${payFilter}
    GROUP BY DATE(pay.payment_date)
    ORDER BY date ASC
  `;
  const dailyTrends = db.prepare(trendQuery).all(...payParams);

  // Overall financial summary
  const totalCollected = db.prepare(`SELECT COALESCE(SUM(pay.amount), 0) as total FROM payments pay ${payFilter}`).get(...payParams).total;

  let billFilter = 'WHERE 1=1';
  const billParams = [];
  if (date_from) {
    billFilter += ' AND bill_date >= ?';
    billParams.push(date_from);
  }
  if (date_to) {
    billFilter += ' AND bill_date <= ?';
    billParams.push(date_to);
  }

  const billsSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_billed,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(balance_amount), 0) as total_pending
    FROM bills
    ${billFilter}
  `).get(...billParams);

  res.json({
    summary: {
      totalCollected,
      totalBilled: billsSummary.total_billed,
      totalPending: billsSummary.total_pending
    },
    paymentMethods,
    dailyTrends
  });
});

module.exports = router;
