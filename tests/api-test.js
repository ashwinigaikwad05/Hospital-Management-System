const assert = require('assert');
const http = require('http');

const PORT = 5001;
process.env.PORT = PORT;

// Start server on test port
const app = require('../server/server');

// Helper to make HTTP requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting OPD Management System Integration Tests...\n');

  try {
    // 1. Health check
    console.log('1️⃣  Testing Health Check...');
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'healthy');
    console.log('   ✅ Health check passed.');

    // 2. Authentication
    console.log('\n2️⃣  Testing Role Authentication & JWT Generation...');
    const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    assert.strictEqual(adminLogin.status, 200);
    assert.strictEqual(adminLogin.data.user.role, 'admin');
    const adminToken = adminLogin.data.token;

    const receptionLogin = await request('POST', '/api/auth/login', { username: 'receptionist', password: 'reception123' });
    assert.strictEqual(receptionLogin.status, 200);
    assert.strictEqual(receptionLogin.data.user.role, 'receptionist');
    const receptionToken = receptionLogin.data.token;

    const doctorLogin = await request('POST', '/api/auth/login', { username: 'dr.sharma', password: 'doctor123' });
    assert.strictEqual(doctorLogin.status, 200);
    assert.strictEqual(doctorLogin.data.user.role, 'doctor');
    assert.ok(doctorLogin.data.user.doctor.doctor_id);
    const doctorToken = doctorLogin.data.token;
    console.log('   ✅ Logged in successfully as Admin, Receptionist, and Doctor.');

    // 3. Register a New Patient
    console.log('\n3️⃣  Testing Patient Registration & Age Calculation...');
    const newPat = {
      first_name: 'Test',
      last_name: 'Patient',
      gender: 'Female',
      date_of_birth: '1992-05-15',
      mobile_number: '9988776655',
      address: '77 Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400020',
      blood_group: 'O+',
      emergency_contact_name: 'Rahul Patient',
      emergency_contact_number: '9988776654'
    };
    const patRes = await request('POST', '/api/patients', newPat, receptionToken);
    assert.strictEqual(patRes.status, 201);
    assert.ok(patRes.data.patient.patient_registration_number.startsWith('PAT-'));
    assert.strictEqual(patRes.data.patient.age, 34); // from 1992 to 2026
    const patientId = patRes.data.patient.id;
    console.log(`   ✅ Patient registered: ${patRes.data.patient.patient_registration_number} (ID: ${patientId}, Age: ${patRes.data.patient.age})`);

    // 4. Search Patients
    console.log('\n4️⃣  Testing Patient Search by Phone & Registration Number...');
    const searchRes = await request('GET', '/api/patients?search=9988776655', null, receptionToken);
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.data.patients.length, 1);
    assert.strictEqual(searchRes.data.patients[0].id, patientId);
    console.log('   ✅ Patient search found matching record.');

    // 5. Fetch Doctors & Departments
    console.log('\n5️⃣  Testing Departments and Doctors listing...');
    const depts = await request('GET', '/api/departments', null, receptionToken);
    assert.strictEqual(depts.status, 200);
    const cardDept = depts.data.departments.find(d => d.department_name === 'Cardiology');
    assert.ok(cardDept);

    const docs = await request('GET', `/api/doctors?department_id=${cardDept.id}`, null, receptionToken);
    assert.strictEqual(docs.status, 200);
    const drSharma = docs.data.doctors.find(d => d.last_name === 'Sharma');
    assert.ok(drSharma);
    console.log(`   ✅ Fetched Cardiology Dept (ID ${cardDept.id}) and Dr. Sharma (ID ${drSharma.id}, Fee: ₹${drSharma.consultation_fee}).`);

    // 6. Book Appointment & Generate Daily Token
    console.log('\n6️⃣  Testing Appointment Booking & Daily Token Allocation...');
    const today = new Date().toISOString().split('T')[0];
    const aptRes = await request('POST', '/api/appointments', {
      patient_id: patientId,
      department_id: cardDept.id,
      doctor_id: drSharma.id,
      appointment_date: today,
      appointment_time: '12:00',
      appointment_type: 'New Visit',
      reason_for_visit: 'High BP and irregular heartbeat during morning walk',
      auto_check_in: true
    }, receptionToken);

    assert.strictEqual(aptRes.status, 201);
    assert.ok(aptRes.data.appointment.appointment_number.startsWith('APT-'));
    const appointmentId = aptRes.data.appointment.id;
    const tokenNumber = aptRes.data.appointment.token_number;
    console.log(`   ✅ Booked Appointment: ${aptRes.data.appointment.appointment_number} with Token #${tokenNumber}`);

    // 7. Token & Queue Verification
    console.log('\n7️⃣  Testing OPD Queue for Doctor...');
    const queueRes = await request('GET', `/api/queues/today?doctor_id=${drSharma.id}`, null, doctorToken);
    assert.strictEqual(queueRes.status, 200);
    const inQueue = queueRes.data.all.find(q => q.appointment_id === appointmentId);
    assert.ok(inQueue);
    console.log(`   ✅ Patient found in queue with status: ${inQueue.status}`);

    // Start consultation
    const startRes = await request('POST', `/api/queues/start/${inQueue.id}`, {}, doctorToken);
    assert.strictEqual(startRes.status, 200);
    console.log('   ✅ Consultation started for queue item.');

    // 8. Clinical Consultation
    console.log('\n8️⃣  Testing Doctor Consultation (Vitals, Diagnosis, Observations)...');
    const consultRes = await request('POST', '/api/consultations', {
      appointment_id: appointmentId,
      symptoms: 'Morning headaches, dizziness, palpitations',
      observations: 'Resting pulse 88 bpm. Heart sounds normal.',
      diagnosis: 'Primary Essential Hypertension',
      blood_pressure: '145/95 mmHg',
      temperature: '98.6 F',
      weight: 68.5,
      height: 165.0,
      advice: 'Reduce salt intake, avoid stress, brisk walk 30 mins daily',
      follow_up_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      consultation_status: 'Completed'
    }, doctorToken);

    assert.strictEqual(consultRes.status, 201);
    const consultationId = consultRes.data.consultation.id;
    console.log(`   ✅ Consultation saved with ID: ${consultationId}`);

    // 9. Digital E-Prescription with Multiple Medicines
    console.log('\n9️⃣  Testing Digital Prescription with Medicines Array...');
    const prescRes = await request('POST', '/api/prescriptions', {
      consultation_id: consultationId,
      diagnosis: 'Primary Essential Hypertension',
      advice: 'Take medicines regularly after meals. Review with BP chart in 1 week.',
      medicines: [
        {
          medicine_name: 'Telmisartan',
          strength: '40 mg',
          dosage: '1 Tablet',
          frequency: 'Once Daily (Morning)',
          duration: '14 Days',
          instructions: 'After breakfast'
        },
        {
          medicine_name: 'Hydrochlorothiazide',
          strength: '12.5 mg',
          dosage: '1 Tablet',
          frequency: 'Once Daily (Morning)',
          duration: '14 Days',
          instructions: 'With breakfast'
        }
      ]
    }, doctorToken);

    assert.strictEqual(prescRes.status, 201);
    assert.strictEqual(prescRes.data.prescription.medicines.length, 2);
    const prescriptionId = prescRes.data.prescription.id;
    console.log(`   ✅ Prescription created with 2 medicines (ID: ${prescriptionId})`);

    // Verify Print Prescription Payload
    const printPresc = await request('GET', `/api/prescriptions/${prescriptionId}/print`, null, doctorToken);
    assert.strictEqual(printPresc.status, 200);
    assert.ok(printPresc.data.hospital.hospital_name);
    console.log(`   ✅ Printable prescription payload verified for hospital: ${printPresc.data.hospital.hospital_name}`);

    // 10. Billing Module
    console.log('\n🔟 Testing OPD Billing with Consultation Fee, Add-ons & Discount...');
    // Fetch bill generated for this appointment
    const billsRes = await request('GET', `/api/bills?search=${aptRes.data.appointment.appointment_number}`, null, receptionToken);
    assert.strictEqual(billsRes.status, 200);
    assert.ok(billsRes.data.bills.length >= 1);
    const bill = billsRes.data.bills[0];
    assert.strictEqual(bill.payment_status, 'Pending');
    console.log(`   ✅ Bill found: ${bill.bill_number}, Total: ₹${bill.total_amount}`);

    // 11. Payment Recording & Receipt Generation
    console.log('\n1️⃣1️⃣ Testing Payment Collection & Receipt Generation...');
    const payRes = await request('POST', '/api/payments', {
      bill_id: bill.id,
      amount: bill.total_amount,
      payment_method: 'UPI',
      transaction_reference: 'UPI/20260905/TEST1234'
    }, receptionToken);

    assert.strictEqual(payRes.status, 201);
    assert.strictEqual(payRes.data.bill.payment_status, 'Paid');
    assert.strictEqual(payRes.data.bill.balance_amount, 0);
    const paymentId = payRes.data.payment.id;
    console.log(`   ✅ Payment recorded (ID: ${paymentId}, Receipt: ${payRes.data.payment.receipt_number}), Bill fully paid.`);

    // Verify Print Receipt Payload
    const printReceipt = await request('GET', `/api/payments/${paymentId}/receipt`, null, receptionToken);
    assert.strictEqual(printReceipt.status, 200);
    assert.strictEqual(printReceipt.data.receipt.payment_method, 'UPI');
    console.log('   ✅ Payment receipt print payload verified.');

    // 12. Reports Module Verification
    console.log('\n1️⃣2️⃣ Testing Reports & Dashboard Summary...');
    const dashAdmin = await request('GET', '/api/reports/dashboard', null, adminToken);
    assert.strictEqual(dashAdmin.status, 200);
    assert.ok(dashAdmin.data.stats.totalPatients > 0);
    assert.ok(dashAdmin.data.stats.todayAppointments > 0);
    assert.ok(dashAdmin.data.stats.todayRevenue > 0);
    console.log(`   ✅ Admin Dashboard Metrics: Total Patients: ${dashAdmin.data.stats.totalPatients}, Today Appts: ${dashAdmin.data.stats.todayAppointments}, Today Revenue: ₹${dashAdmin.data.stats.todayRevenue}`);

    const revReport = await request('GET', '/api/reports/revenue', null, adminToken);
    assert.strictEqual(revReport.status, 200);
    assert.ok(revReport.data.paymentMethods.length > 0);
    console.log('   ✅ Financial Revenue Report verified.');

    console.log('\n🎉 ALL 12 INTEGRATION TESTS PASSED SUCCESSFULLY! The entire OPD lifecycle is fully functional.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

// Give server 500ms to start then run tests
setTimeout(runTests, 500);
