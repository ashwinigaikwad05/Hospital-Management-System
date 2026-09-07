import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Users,
  CalendarCheck,
  Stethoscope,
  IndianRupee,
  Filter,
  PieChart
} from 'lucide-react';

export default function ReportsView() {
  const { showToast } = useToast();

  const [activeReportTab, setActiveReportTab] = useState('financial'); // 'financial', 'appointments', 'doctors', 'patients'
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Report Data
  const [financialData, setFinancialData] = useState(null);
  const [appointmentData, setAppointmentData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [patientData, setPatientData] = useState(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeReportTab === 'financial') {
        const res = await api.getRevenueReports({ date_from: dateFrom, date_to: dateTo });
        setFinancialData(res);
      } else if (activeReportTab === 'appointments') {
        const res = await api.getAppointmentReports({ date_from: dateFrom, date_to: dateTo });
        setAppointmentData(res);
      } else if (activeReportTab === 'doctors') {
        const res = await api.getDoctorReports({ date_from: dateFrom, date_to: dateTo });
        setDoctorData(res);
      } else if (activeReportTab === 'patients') {
        const res = await api.getPatientReports({ date_from: dateFrom, date_to: dateTo });
        setPatientData(res);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeReportTab, dateFrom, dateTo]);

  // Export CSV
  const handleExportCSV = () => {
    let rows = [];
    let filename = `report_${activeReportTab}_${dateFrom}_to_${dateTo}.csv`;

    if (activeReportTab === 'financial' && financialData?.dailyTrends) {
      rows.push(['Date', 'Transaction Count', 'Total Amount (INR)']);
      financialData.dailyTrends.forEach(d => rows.push([d.date, d.transaction_count, d.daily_total]));
    } else if (activeReportTab === 'appointments' && appointmentData?.appointments) {
      rows.push(['Appointment Number', 'Date', 'Patient Name', 'Doctor Name', 'Department', 'Status']);
      appointmentData.appointments.forEach(a => rows.push([
        a.appointment_number, a.appointment_date, `${a.patient_first_name} ${a.patient_last_name}`,
        `Dr. ${a.doctor_first_name} ${a.doctor_last_name}`, a.department_name, a.status
      ]));
    } else if (activeReportTab === 'doctors' && doctorData?.doctorReports) {
      rows.push(['Doctor Code', 'Doctor Name', 'Department', 'Total Appts', 'Completed', 'Consultations', 'Billed (INR)', 'Collected (INR)']);
      doctorData.doctorReports.forEach(d => rows.push([
        d.doctor_code, `Dr. ${d.first_name} ${d.last_name}`, d.department_name,
        d.total_appointments, d.completed_appointments, d.total_consultations,
        d.total_billed_amount, d.total_collected_amount
      ]));
    } else if (activeReportTab === 'patients' && patientData?.patients) {
      rows.push(['Registration No', 'Name', 'Gender', 'Age', 'Mobile', 'Blood Group', 'City', 'Registered Date']);
      patientData.patients.forEach(p => rows.push([
        p.patient_registration_number, `${p.first_name} ${p.last_name}`, p.gender, p.age,
        p.mobile_number, p.blood_group, p.city, p.created_at
      ]));
    }

    if (rows.length === 0) {
      showToast('No data available to export.', 'info');
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Analytics & Reports Module</h2>
          <p className="text-xs text-slate-500">
            Exportable operational metrics, OPD patient demographics, appointment volumes, and financial turnover
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Date Filter & Tab Selection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveReportTab('financial')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeReportTab === 'financial' ? 'bg-white text-hospital-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IndianRupee className="w-4 h-4" /> Financial Revenue
            </button>
            <button
              onClick={() => setActiveReportTab('appointments')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeReportTab === 'appointments' ? 'bg-white text-hospital-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4" /> Appointments
            </button>
            <button
              onClick={() => setActiveReportTab('doctors')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeReportTab === 'doctors' ? 'bg-white text-hospital-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" /> Doctor Workload
            </button>
            <button
              onClick={() => setActiveReportTab('patients')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
                activeReportTab === 'patients' ? 'bg-white text-hospital-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" /> Patients & Demographics
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-500">Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* REPORT CONTENT VIEW */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-hospital-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Aggregating report data...
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. FINANCIAL REVENUE REPORT */}
          {activeReportTab === 'financial' && financialData && (
            <div className="space-y-6">
              {/* Financial KPI Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Revenue Collected</p>
                  <h3 className="text-2xl font-black text-emerald-700 mt-1">
                    ₹{Number(financialData.summary?.totalCollected || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Billed Invoices</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    ₹{Number(financialData.summary?.totalBilled || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-rose-600">Pending Bill Balance</p>
                  <h3 className="text-2xl font-black text-rose-600 mt-1">
                    ₹{Number(financialData.summary?.totalPending || 0).toLocaleString()}
                  </h3>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Collections by Payment Method</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  {financialData.paymentMethods?.map(m => (
                    <div key={m.payment_method} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="font-bold text-slate-700 text-sm uppercase">{m.payment_method}</p>
                      <p className="text-lg font-black text-hospital-800 mt-1">₹{Number(m.total_amount).toFixed(2)}</p>
                      <p className="text-[11px] text-slate-400">{m.transaction_count} transaction(s)</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Revenue Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
                  Daily Revenue Trend
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Receipts / Transactions</th>
                      <th className="py-3 px-4 text-right">Daily Total Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialData.dailyTrends?.length === 0 ? (
                      <tr><td colSpan="3" className="py-6 text-center text-slate-400">No payment receipts in this range.</td></tr>
                    ) : (
                      financialData.dailyTrends?.map(d => (
                        <tr key={d.date} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-semibold text-slate-800">{d.date}</td>
                          <td className="py-3 px-4 text-center text-slate-600 font-bold">{d.transaction_count}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                            ₹{Number(d.daily_total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. APPOINTMENTS REPORT */}
          {activeReportTab === 'appointments' && appointmentData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {Object.entries(appointmentData.statusStats || {}).map(([stat, count]) => (
                  <div key={stat} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{stat}</p>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">{count}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
                  Appointments Register ({appointmentData.total})
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Appt #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Doctor</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointmentData.appointments?.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{a.appointment_number}</td>
                        <td className="py-3 px-4 text-slate-600">{a.appointment_date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{a.patient_first_name} {a.patient_last_name}</td>
                        <td className="py-3 px-4">Dr. {a.doctor_first_name} {a.doctor_last_name}</td>
                        <td className="py-3 px-4 text-slate-600">{a.department_name}</td>
                        <td className="py-3 px-4 font-bold text-hospital-700">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. DOCTOR WORKLOAD REPORT */}
          {activeReportTab === 'doctors' && doctorData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
                Doctor Workload & Consultation Performance
              </div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Total Appts</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Consultations</th>
                    <th className="py-3 px-4 text-right">Total Billed</th>
                    <th className="py-3 px-4 text-right">Revenue Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctorData.doctorReports?.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Dr. {doc.first_name} {doc.last_name}
                        <p className="text-[11px] font-normal text-slate-400">{doc.doctor_code}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{doc.department_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{doc.total_appointments}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{doc.completed_appointments}</td>
                      <td className="py-3 px-4 text-center font-bold text-hospital-700">{doc.total_consultations}</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{Number(doc.total_billed_amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">₹{Number(doc.total_collected_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. PATIENTS & DEMOGRAPHICS REPORT */}
          {activeReportTab === 'patients' && patientData && (
            <div className="space-y-6">
              {/* Demographics Grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm mb-3">Gender Demographics</h4>
                  <div className="flex gap-4">
                    {patientData.genderBreakdown?.map(g => (
                      <div key={g.gender} className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase">{g.gender}</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{g.count}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm mb-3">Blood Group Distribution</h4>
                  <div className="flex flex-wrap gap-2">
                    {patientData.bloodGroupBreakdown?.map(bg => (
                      <div key={bg.blood_group} className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                        <span className="font-bold text-rose-800 text-xs">{bg.blood_group}: </span>
                        <span className="font-bold text-rose-950 text-xs">{bg.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Register Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
                  New Patient Registrations ({patientData.total})
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Reg Number</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Age/Gender</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patientData.patients?.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-hospital-700">{p.patient_registration_number}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.first_name} {p.last_name}</td>
                        <td className="py-3 px-4">{p.age} yrs / {p.gender}</td>
                        <td className="py-3 px-4 text-slate-600">{p.mobile_number}</td>
                        <td className="py-3 px-4 text-slate-600">{p.city}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
