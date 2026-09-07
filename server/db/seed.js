const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./database');

function seedDatabase() {
  initializeDatabase();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already populated, skipping initial seed.');
    return;
  }

  console.log('Seeding initial database data...');

  // System Settings
  const settings = [
    ['hospital_name', 'OPD Management System'],
    ['tagline', 'Excellence in Healthcare & Patient Wellbeing'],
    ['address', '45 Healthcare Boulevard, Medical Enclave, Sector 12'],
    ['city', 'Mumbai'],
    ['state', 'Maharashtra'],
    ['pincode', '400001'],
    ['phone', '+91 22 2456 7890'],
    ['email', 'contact@opdmanagementsystem.com'],
    ['website', 'https://opdmanagementsystem.com'],
    ['currency_symbol', '₹'],
    ['tax_rate', '0'],
    ['gst_number', '27AABCU9603R1ZM']
  ];

  const insertSetting = db.prepare('INSERT OR REPLACE INTO system_settings (setting_key, setting_value) VALUES (?, ?)');
  for (const [key, val] of settings) {
    insertSetting.run(key, val);
  }

  // Passwords
  const adminHash = bcrypt.hashSync('admin123', 10);
  const staffHash = bcrypt.hashSync('reception123', 10);
  const docHash = bcrypt.hashSync('doctor123', 10);

  // Departments
  const departmentsData = [
    ['General Medicine', 'Primary healthcare, diagnosis of acute and chronic adult illnesses.', 'active'],
    ['Cardiology', 'Comprehensive cardiovascular diagnosis, ECG, hypertension, and heart care.', 'active'],
    ['Pediatrics', 'Specialized healthcare and developmental tracking for infants, children, and adolescents.', 'active'],
    ['Orthopedics', 'Musculoskeletal system, bone fractures, arthritis, and joint pain management.', 'active'],
    ['Dermatology', 'Skin, hair, nail disorders, cosmetic treatments, and allergy therapies.', 'active'],
    ['Gynecology & Obstetrics', 'Women health, maternal care, prenatal monitoring, and fertility guidance.', 'active'],
    ['ENT (Otolaryngology)', 'Disorders of ear, nose, throat, sinuses, and larynx.', 'active'],
    ['Ophthalmology', 'Comprehensive vision care, eye examinations, and ocular disorder treatment.', 'active']
  ];

  const insertDept = db.prepare('INSERT INTO departments (department_name, description, status) VALUES (?, ?, ?)');
  const deptIds = {};
  for (const dept of departmentsData) {
    const result = insertDept.run(dept[0], dept[1], dept[2]);
    deptIds[dept[0]] = Number(result.lastInsertRowid);
  }

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, email, mobile_number, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminUser = insertUser.run('admin', adminHash, 'admin', 'System Administrator', 'admin@apexcarehospital.com', '9876543210', 'active');
  const receptionUser = insertUser.run('receptionist', staffHash, 'receptionist', 'Pooja Sharma (Lead Receptionist)', 'reception@apexcarehospital.com', '9876543211', 'active');

  const doc1User = insertUser.run('dr.sharma', docHash, 'doctor', 'Dr. Rajesh Sharma', 'dr.sharma@apexcarehospital.com', '9876543212', 'active');
  const doc2User = insertUser.run('dr.patel', docHash, 'doctor', 'Dr. Ananya Patel', 'dr.patel@apexcarehospital.com', '9876543213', 'active');
  const doc3User = insertUser.run('dr.verma', docHash, 'doctor', 'Dr. Vikram Verma', 'dr.verma@apexcarehospital.com', '9876543214', 'active');
  const doc4User = insertUser.run('dr.gupta', docHash, 'doctor', 'Dr. Neha Gupta', 'dr.gupta@apexcarehospital.com', '9876543215', 'active');
  const doc5User = insertUser.run('dr.khan', docHash, 'doctor', 'Dr. Tariq Khan', 'dr.khan@apexcarehospital.com', '9876543216', 'active');

  // Doctors
  const insertDoc = db.prepare(`
    INSERT INTO doctors (
      user_id, doctor_code, first_name, last_name, gender, mobile_number, email,
      department_id, specialization, qualification, experience, consultation_fee,
      registration_number, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const doc1 = insertDoc.run(
    Number(doc1User.lastInsertRowid), 'DOC-CRD-01', 'Rajesh', 'Sharma', 'Male', '9876543212',
    'dr.sharma@apexcarehospital.com', deptIds['Cardiology'], 'Interventional Cardiology & Hypertension',
    'MBBS, MD (Medicine), DM (Cardiology)', 14, 800.00, 'MCI-CARD-24109', 'active'
  );

  const doc2 = insertDoc.run(
    Number(doc2User.lastInsertRowid), 'DOC-PED-02', 'Ananya', 'Patel', 'Female', '9876543213',
    'dr.patel@apexcarehospital.com', deptIds['Pediatrics'], 'Pediatric Care & Neonatology',
    'MBBS, DCH, DNB (Pediatrics)', 9, 600.00, 'MCI-PED-88123', 'active'
  );

  const doc3 = insertDoc.run(
    Number(doc3User.lastInsertRowid), 'DOC-ORT-03', 'Vikram', 'Verma', 'Male', '9876543214',
    'dr.verma@apexcarehospital.com', deptIds['Orthopedics'], 'Joint Replacement & Spine Surgery',
    'MBBS, MS (Orthopedics)', 16, 750.00, 'MCI-ORT-31940', 'active'
  );

  const doc4 = insertDoc.run(
    Number(doc4User.lastInsertRowid), 'DOC-DER-04', 'Neha', 'Gupta', 'Female', '9876543215',
    'dr.gupta@apexcarehospital.com', deptIds['Dermatology'], 'Clinical Dermatology & Cosmetology',
    'MBBS, MD (DVL)', 8, 500.00, 'MCI-DER-72019', 'active'
  );

  const doc5 = insertDoc.run(
    Number(doc5User.lastInsertRowid), 'DOC-GEN-05', 'Tariq', 'Khan', 'Male', '9876543216',
    'dr.khan@apexcarehospital.com', deptIds['General Medicine'], 'Internal Medicine & Infectious Diseases',
    'MBBS, MD (General Medicine)', 12, 500.00, 'MCI-GEN-10294', 'active'
  );

  // Patients
  const patientsData = [
    ['PAT-2026-0001', 'Aarav', 'Kumar', 'Singh', 'Male', '1989-04-15', 37, '9820112233', '9820112234', 'aarav.singh@email.com', 'Flat 402, Sunshine Heights, Andheri West', 'Mumbai', 'Maharashtra', '400053', 'B+', 'Pooja Singh', '9820112299'],
    ['PAT-2026-0002', 'Sunita', 'Devi', 'Sharma', 'Female', '1974-11-22', 51, '9833445566', null, 'sunita.sharma@email.com', '12 Lake View Apts, Bandra', 'Mumbai', 'Maharashtra', '400050', 'O+', 'Ramesh Sharma', '9833445599'],
    ['PAT-2026-0003', 'Karan', '', 'Mehta', 'Male', '2018-06-10', 8, '9877112233', null, 'karan.parents@email.com', 'B-15 Gokul Dham, Goregaon East', 'Mumbai', 'Maharashtra', '400063', 'A+', 'Sanjay Mehta', '9877112233'],
    ['PAT-2026-0004', 'Deepa', 'Rani', 'Nair', 'Female', '1995-02-18', 31, '9892334455', '9892334456', 'deepa.nair@email.com', 'House 55, Green Park, Powai', 'Mumbai', 'Maharashtra', '400076', 'AB+', 'Vivek Nair', '9892334499'],
    ['PAT-2026-0005', 'Mohammed', 'Iqbal', 'Ansari', 'Male', '1962-09-05', 64, '9819556677', null, 'iqbal.ansari@email.com', 'Plot 89, Kurla West', 'Mumbai', 'Maharashtra', '400070', 'O-', 'Fatima Ansari', '9819556699'],
    ['PAT-2026-0006', 'Priya', 'Darshini', 'Patil', 'Female', '2001-12-04', 24, '9867001122', null, 'priya.patil@email.com', 'Room 10, Shivaji Nagar, Thane', 'Thane', 'Maharashtra', '400601', 'B-', 'Rohan Patil', '9867001188']
  ];

  const insertPat = db.prepare(`
    INSERT INTO patients (
      patient_registration_number, first_name, middle_name, last_name, gender,
      date_of_birth, age, mobile_number, alternate_mobile_number, email,
      address, city, state, pincode, blood_group,
      emergency_contact_name, emergency_contact_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const patIds = [];
  for (const p of patientsData) {
    const res = insertPat.run(...p);
    patIds.push(Number(res.lastInsertRowid));
  }

  // Today's Date String (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  // Appointments, Queues, Consultations, Prescriptions, Bills, Payments
  const insertApt = db.prepare(`
    INSERT INTO appointments (
      appointment_number, patient_id, department_id, doctor_id,
      appointment_date, appointment_time, token_number, appointment_type,
      status, reason_for_visit, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQueue = db.prepare(`
    INSERT INTO queues (
      appointment_id, doctor_id, token_number, queue_date,
      status, called_at, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertConsult = db.prepare(`
    INSERT INTO consultations (
      appointment_id, patient_id, doctor_id, symptoms, observations,
      diagnosis, blood_pressure, temperature, weight, height,
      advice, follow_up_date, consultation_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPrescription = db.prepare(`
    INSERT INTO prescriptions (
      consultation_id, patient_id, doctor_id, prescription_date, diagnosis, advice
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPrescMed = db.prepare(`
    INSERT INTO prescription_medicines (
      prescription_id, medicine_name, strength, dosage, frequency, duration, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBill = db.prepare(`
    INSERT INTO bills (
      bill_number, patient_id, appointment_id, consultation_id,
      bill_date, consultation_fee, additional_charges, discount,
      total_amount, paid_amount, balance_amount, payment_status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPay = db.prepare(`
    INSERT INTO payments (
      receipt_number, bill_id, payment_date, amount,
      payment_method, transaction_reference, payment_status, received_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Patient 1: Completed consultation with Dr. Sharma (Cardiology) today
  const apt1 = insertApt.run(
    `APT-${today.replace(/-/g, '')}-001`, patIds[0], deptIds['Cardiology'], Number(doc1.lastInsertRowid),
    today, '09:30', 1, 'Routine Checkup', 'Completed', 'Chest discomfort on mild exertion and high BP follow-up', 2
  );
  const apt1Id = Number(apt1.lastInsertRowid);

  insertQueue.run(
    apt1Id, Number(doc1.lastInsertRowid), 1, today, 'Completed',
    `${today} 09:35:00`, `${today} 09:38:00`, `${today} 09:55:00`
  );

  const consult1 = insertConsult.run(
    apt1Id, patIds[0], Number(doc1.lastInsertRowid),
    'Occasional chest tightness, palpitations during climbing stairs, mild fatigue.',
    'S1 S2 heard normal. No murmurs. Bilateral vesicular breath sounds clear.',
    'Stage 2 Essential Hypertension with mild Angina pectoris.',
    '142/92 mmHg', '98.4 F', 76.5, 172.0,
    'Low sodium DASH diet, 30 min daily brisk walking, avoid smoking/alcohol, monitor BP morning & evening.',
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    'Completed'
  );
  const consult1Id = Number(consult1.lastInsertRowid);

  const presc1 = insertPrescription.run(
    consult1Id, patIds[0], Number(doc1.lastInsertRowid), today,
    'Stage 2 Essential Hypertension with mild Angina pectoris.',
    'Maintain daily blood pressure log. Review with ECG in 2 weeks.'
  );
  const presc1Id = Number(presc1.lastInsertRowid);

  insertPrescMed.run(presc1Id, 'Telmisartan', '40 mg', '1 Tablet', 'Once Daily (Morning)', '14 Days', 'After breakfast');
  insertPrescMed.run(presc1Id, 'Amlodipine', '5 mg', '1 Tablet', 'Once Daily (Night)', '14 Days', 'At bedtime');
  insertPrescMed.run(presc1Id, 'Aspirin (Ecosprin)', '75 mg', '1 Tablet', 'Once Daily (Afternoon)', '14 Days', 'After lunch');

  const bill1 = insertBill.run(
    `BILL-${today.replace(/-/g, '')}-001`, patIds[0], apt1Id, consult1Id,
    today, 800.00, 200.00, 50.00, 950.00, 950.00, 0.00, 'Paid', 2
  );
  const bill1Id = Number(bill1.lastInsertRowid);

  insertPay.run(
    `RCP-${today.replace(/-/g, '')}-001`, bill1Id, `${today} 10:02:00`, 950.00,
    'UPI', 'UPI/20260905100201/AXIS', 'Success', 2
  );

  // Patient 2: In Consultation right now with Dr. Sharma (Cardiology) - Token 2
  const apt2 = insertApt.run(
    `APT-${today.replace(/-/g, '')}-002`, patIds[1], deptIds['Cardiology'], Number(doc1.lastInsertRowid),
    today, '10:00', 2, 'New Visit', 'In Consultation', 'Frequent dizziness, breathlessness, irregular heartbeat', 2
  );
  const apt2Id = Number(apt2.lastInsertRowid);

  insertQueue.run(
    apt2Id, Number(doc1.lastInsertRowid), 2, today, 'In Consultation',
    `${today} 10:05:00`, `${today} 10:10:00`, null
  );

  // Patient 3: Waiting in Queue for Dr. Sharma (Cardiology) - Token 3
  const apt3 = insertApt.run(
    `APT-${today.replace(/-/g, '')}-003`, patIds[4], deptIds['Cardiology'], Number(doc1.lastInsertRowid),
    today, '10:30', 3, 'Follow-up', 'Waiting', 'Post-stent 6-month routine review and lipid profile check', 2
  );
  const apt3Id = Number(apt3.lastInsertRowid);

  insertQueue.run(
    apt3Id, Number(doc1.lastInsertRowid), 3, today, 'Waiting',
    null, null, null
  );

  // Patient 4: Checked-In for Dr. Patel (Pediatrics) - Token 1
  const apt4 = insertApt.run(
    `APT-${today.replace(/-/g, '')}-004`, patIds[2], deptIds['Pediatrics'], Number(doc2.lastInsertRowid),
    today, '10:15', 1, 'New Visit', 'Waiting', 'Fever, sore throat, and dry cough for 3 days', 2
  );
  const apt4Id = Number(apt4.lastInsertRowid);

  insertQueue.run(
    apt4Id, Number(doc2.lastInsertRowid), 1, today, 'Waiting',
    null, null, null
  );

  // Patient 5: Booked appointment for Dr. Verma (Orthopedics)
  insertApt.run(
    `APT-${today.replace(/-/g, '')}-005`, patIds[3], deptIds['Orthopedics'], Number(doc3.lastInsertRowid),
    today, '11:00', 1, 'New Visit', 'Booked', 'Severe lower back pain radiating to left leg for 2 weeks', 2
  );

  // Patient 6: Booked appointment for Dr. Gupta (Dermatology)
  insertApt.run(
    `APT-${today.replace(/-/g, '')}-006`, patIds[5], deptIds['Dermatology'], Number(doc4.lastInsertRowid),
    today, '11:30', 1, 'New Visit', 'Booked', 'Eczema flare-up on hands and neck, itching', 2
  );

  console.log('Database seeded successfully with users, departments, doctors, patients, queues, and clinical transactions!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
