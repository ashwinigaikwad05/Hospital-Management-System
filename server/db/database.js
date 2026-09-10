const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const originalDbPath = path.join(__dirname, '../../data/opd.db');

let dbPath;
if (isVercel) {
  const tmpDir = '/tmp/data';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  dbPath = path.join(tmpDir, 'opd.db');

  // If opd.db doesn't exist in /tmp yet, copy it from repository data/opd.db
  if (!fs.existsSync(dbPath) && fs.existsSync(originalDbPath)) {
    try {
      fs.copyFileSync(originalDbPath, dbPath);
    } catch (e) {
      console.warn('Could not copy initial db, will initialize fresh:', e.message);
    }
  }
} else {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'opd.db');
}

const db = new DatabaseSync(dbPath);

// Enable foreign keys and journal mode
db.exec('PRAGMA foreign_keys = ON;');
if (!isVercel) {
  db.exec('PRAGMA journal_mode = WAL;');
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'receptionist')),
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile_number TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_name TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      doctor_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
      mobile_number TEXT NOT NULL,
      email TEXT NOT NULL,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      specialization TEXT NOT NULL,
      qualification TEXT NOT NULL,
      experience INTEGER NOT NULL DEFAULT 0,
      consultation_fee REAL NOT NULL DEFAULT 0.00,
      registration_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_registration_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
      date_of_birth DATE NOT NULL,
      age INTEGER NOT NULL,
      mobile_number TEXT NOT NULL,
      alternate_mobile_number TEXT,
      email TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      blood_group TEXT CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      emergency_contact_name TEXT,
      emergency_contact_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_number TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      token_number INTEGER NOT NULL,
      appointment_type TEXT DEFAULT 'New Visit' CHECK(appointment_type IN ('New Visit', 'Follow-up', 'Emergency', 'Routine Checkup')),
      status TEXT DEFAULT 'Booked' CHECK(status IN ('Booked', 'Confirmed', 'Checked-In', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show')),
      reason_for_visit TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
      token_number INTEGER NOT NULL,
      queue_date DATE NOT NULL,
      status TEXT DEFAULT 'Waiting' CHECK(status IN ('Waiting', 'Called', 'Skipped', 'In Consultation', 'Completed')),
      called_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
      symptoms TEXT NOT NULL,
      observations TEXT,
      diagnosis TEXT NOT NULL,
      blood_pressure TEXT,
      temperature TEXT,
      weight REAL,
      height REAL,
      advice TEXT,
      follow_up_date DATE,
      consultation_status TEXT DEFAULT 'Completed' CHECK(consultation_status IN ('In Progress', 'Completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultation_id INTEGER UNIQUE NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
      prescription_date DATE NOT NULL,
      diagnosis TEXT NOT NULL,
      advice TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescription_medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
      medicine_name TEXT NOT NULL,
      strength TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructions TEXT
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
      consultation_id INTEGER REFERENCES consultations(id) ON DELETE SET NULL,
      bill_date DATE NOT NULL,
      consultation_fee REAL NOT NULL DEFAULT 0.00,
      additional_charges REAL NOT NULL DEFAULT 0.00,
      discount REAL NOT NULL DEFAULT 0.00,
      total_amount REAL NOT NULL DEFAULT 0.00,
      paid_amount REAL NOT NULL DEFAULT 0.00,
      balance_amount REAL NOT NULL DEFAULT 0.00,
      payment_status TEXT DEFAULT 'Pending' CHECK(payment_status IN ('Pending', 'Partially Paid', 'Paid', 'Cancelled', 'Refunded')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE RESTRICT,
      payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'UPI', 'Card', 'Bank Transfer')),
      transaction_reference TEXT,
      payment_status TEXT DEFAULT 'Success' CHECK(payment_status IN ('Success', 'Failed', 'Refunded')),
      received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for fast lookup and reporting
    CREATE INDEX IF NOT EXISTS idx_patients_reg_num ON patients(patient_registration_number);
    CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile_number);
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
    CREATE INDEX IF NOT EXISTS idx_appointments_date_doc ON appointments(appointment_date, doctor_id);
    CREATE INDEX IF NOT EXISTS idx_queues_date_doc ON queues(queue_date, doctor_id, status);
    CREATE INDEX IF NOT EXISTS idx_bills_appointment ON bills(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
    CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
  `);
}

initializeDatabase();

module.exports = {
  db,
  initializeDatabase
};
