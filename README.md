# 🏥 Apex Care — Outpatient Department (OPD) Management System

A complete, modern, responsive, and production-ready **OPD (Outpatient Department) Management System** built with **Node.js (v24)**, native relational **SQLite (`DatabaseSync`)**, **Express.js**, **React**, and **Tailwind CSS**.

---

## 🌟 Key Highlights & Features

### 1. Complete End-to-End Outpatient Workflow
- **Step 1: Patient Search**: Multi-field search by Registration Number (`PAT-YYYY-XXXX`), Full Name, or 10-digit Phone Number.
- **Step 2: Patient Registration**: Auto-generated sequential Registration Number, automatic Age calculation from Date of Birth, blood group, address, and emergency contact details.
- **Step 3: Department Selection**: Filter active clinical specialties (Cardiology, Orthopedics, Pediatrics, Dermatology, General Medicine, etc.).
- **Step 4: Doctor Selection**: Dynamic selection of active doctors assigned to the department with fee preview.
- **Step 5: Appointment Booking**: Generates unique appointment ID (`APT-YYYYMMDD-XXX`) with visit type and chief complaints.
- **Step 6: Daily Token Generation**: Sequential daily token (`#1`, `#2`, `#3`...) resetting daily per doctor.
- **Step 7: Check-In**: Front-desk marks patient arrival into the waiting lounge.
- **Step 8: Real-Time Queue**: Patients enter the doctor's live queue board (`Waiting` status).
- **Step 9: Doctor Calls Patient**: Doctor calls the next patient (`Called` status) with audio-visual notice.
- **Step 10: In Consultation**: Patient status moves to `In Consultation`.
- **Step 11: Patient Medical Records**: Doctor reviews previous consultations, vitals trends, and past prescriptions.
- **Step 12: Clinical Examination**: Record vitals (BP, temperature, pulse, weight, height, auto-calculated BMI), symptoms, clinical observations, and diagnosis.
- **Step 13: Digital Prescription (Rx)**: Prescribe multiple medications with strength, dosage, frequency, duration, and food timing instructions + one-click common presets.
- **Step 14: Complete Consultation**: Saves clinical consultation and auto-generates OPD bill draft.
- **Step 15: OPD Billing**: Calculates `Total Amount = Consultation Fee + Additional Charges - Discount`.
- **Step 16: Payment Collection**: Cash, UPI / QR, Card, and Bank Transfer with full or partial payment support.
- **Step 17: Status & Ledger Update**: Automatic balance recalculation (`Paid` or `Partially Paid`).
- **Step 18: Print Outputs**: Dedicated `@media print` layouts for:
  - 📄 **Doctor's Medical Prescription** (hospital letterhead, doctor credentials, patient vitals, diagnosis, Rx medicine table, signature)
  - 🧾 **OPD Consultation Invoice / Bill** (itemized fees, additional clinical charges, discount, remaining balance)
  - 🧾 **Official Payment Receipt** (receipt number, payment method, transaction ref, cashier signature)
- **Step 19: Analytics & Reporting**: Real-time operational, appointment, doctor workload, and financial turnover reporting with CSV export.

---

## 👥 Role-Based Access Control & Demo Accounts

The system includes pre-seeded accounts for each user role, plus an **instant 1-click Demo Switcher** in the top navigation bar:

| Role | Username | Password | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full system access: Users & staff management, Departments, Doctors, Patients, Appointments, Queues, Billing, Revenue & Clinical Reports, Hospital Settings. |
| **Receptionist** | `receptionist` | `reception123` | Patient search & registration, booking & rescheduling appointments, daily token allocation, patient check-in, billing & payment receipts. |
| **Doctor** | `dr.sharma` | `doctor123` | Doctor Station: Today's queue, call/skip patients, record vitals, symptoms & diagnosis, issue digital prescriptions, review patient medical history. |

---

## 🗄️ Relational Database Schema (SQLite `DatabaseSync`)

The database is powered by Node.js 24's native `node:sqlite` engine (`data/opd.db`) with foreign key constraints (`PRAGMA foreign_keys = ON;`), WAL journal mode, and ACID transactions:

1. **`users`**: System authentication, bcrypt password hashes, roles (`admin`, `doctor`, `receptionist`), status.
2. **`departments`**: Clinical departments (Cardiology, Orthopedics, Pediatrics, etc.).
3. **`doctors`**: Doctor profiles, user reference, doctor codes, department foreign key, specialization, consultation fee, registration number.
4. **`patients`**: Outpatient files, registration numbers (`PAT-YYYY-XXXX`), demographics, contact, blood group, emergency contact.
5. **`appointments`**: Appointment numbers (`APT-YYYYMMDD-XXX`), patient FK, doctor FK, department FK, date, time, daily token number, status.
6. **`queues`**: Daily doctor-wise queue state (`Waiting`, `Called`, `Skipped`, `In Consultation`, `Completed`) with timing timestamps.
7. **`consultations`**: Clinical vitals (BP, temp, height, weight), symptoms, physical observations, diagnosis, advice, follow-up date.
8. **`prescriptions`**: Prescription header linked to consultation, patient, doctor, and date.
9. **`prescription_medicines`**: Itemized medications: medicine name, strength, dosage, frequency, duration, instructions.
10. **`bills`**: Itemized OPD invoice (`BILL-YYYYMMDD-XXX`), consultation fee, add-on charges, discounts, total, paid amount, balance due.
11. **`payments`**: Payment transactions (`RCP-YYYYMMDD-XXX`), payment method (Cash, UPI, Card, Bank Transfer), transaction reference.
12. **`system_settings`**: Hospital name, address, phone, email, GSTIN, currency symbol (`₹`).

---

## 🚀 Getting Started & Local Deployment

### Prerequisites
- Node.js **v22+** (tested on Node.js **v24.19.0**)
- npm (Node Package Manager)

### Directory Structure
```
opd-management-system/
├── server/
│   ├── db/
│   │   ├── database.js     # Native SQLite schema & connection
│   │   └── seed.js         # Initial seed data generator
│   ├── middleware/
│   │   └── auth.js         # JWT & RBAC middleware
│   ├── routes/             # RESTful API controllers (auth, patients, appointments, queues, bills, etc.)
│   └── server.js           # Main Express server & client host
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI & Print templates
│   │   ├── context/        # Auth & Toast state
│   │   ├── views/          # Module screens (Dashboard, Patients, Queue, Consultation, etc.)
│   │   └── api.js          # Unified API client
│   └── dist/               # Optimized production bundle
├── tests/
│   └── api-test.js         # Automated integration test suite
└── package.json
```

### Running the Application

1. **Start the Production Server (Backend + Frontend)**:
   ```bash
   npm start
   ```
   Open your browser at **`http://localhost:5000`**.

2. **Run Automated Test Suite**:
   ```bash
   npm test
   ```
   Runs the 12-stage end-to-end integration test validating auth, patient registration, appointment booking, token queues, clinical consultation, e-prescriptions, billing, and receipts.

3. **Re-seed Initial Data (Optional)**:
   ```bash
   npm run seed
   ```

4. **Run in Development Mode**:
   - Backend: `node --watch server/server.js` (runs on port 5000)
   - Frontend: `cd client && npm run dev` (runs on port 3000 with API proxy)

---

## 🖨️ Professional Print Formats
All print actions use clean `@media print` styling:
- Press the **Print Prescription** button to print standard A4 medical prescriptions with doctor signature blocks.
- Press the **Print Bill** button to print itemized hospital billing statements.
- Press the **Print Receipt** button to print official cashier receipts with transaction IDs and stamps.
