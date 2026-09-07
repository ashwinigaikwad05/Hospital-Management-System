import React from 'react';
import { Printer, X } from 'lucide-react';

export default function PrescriptionPrint({ data, onClose }) {
  if (!data || !data.prescription) return null;

  const { prescription, hospital = {} } = data;
  const medicines = prescription.medicines || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto print-sheet">
        {/* Print Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white no-print">
          <span className="text-sm font-semibold flex items-center gap-2">
            📄 Medical E-Prescription Preview
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-hospital-600 hover:bg-hospital-500 rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Prescription
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prescription Paper */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white">
          {/* Hospital Letterhead Header */}
          <div className="flex justify-between items-start border-b-2 border-hospital-600 pb-5 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-hospital-800 uppercase">
                {hospital.hospital_name || 'OPD Management System'}
              </h1>
              <p className="text-xs font-medium text-slate-500 italic mt-0.5">
                {hospital.tagline || 'Excellence in Healthcare & Patient Wellbeing'}
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                {hospital.address || '45 Healthcare Boulevard, Medical Enclave'}
              </p>
              <p className="text-xs text-slate-600">
                Phone: {hospital.phone || '+91 22 2456 7890'} | Email: {hospital.email || 'contact@opdmanagementsystem.com'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-hospital-100 text-hospital-800 text-xs font-bold uppercase rounded-md tracking-wider">
                Outpatient Prescription
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Date: <strong className="text-slate-800">{prescription.prescription_date}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Rx ID: <strong className="text-slate-800">RX-{String(prescription.id).padStart(5, '0')}</strong>
              </p>
            </div>
          </div>

          {/* Doctor & Patient Info Grids */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            {/* Doctor Info */}
            <div className="border-r border-slate-200 pr-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Consulting Physician</p>
              <h3 className="text-sm font-bold text-slate-900">
                Dr. {prescription.doctor_first_name} {prescription.doctor_last_name}
              </h3>
              <p className="text-hospital-700 font-semibold">{prescription.department_name}</p>
              <p className="text-slate-600">{prescription.qualification}</p>
              <p className="text-slate-500">{prescription.specialization}</p>
              <p className="text-slate-400 mt-1 font-mono">Reg No: {prescription.doctor_reg_no || 'MCI-REG-VALID'}</p>
            </div>

            {/* Patient Info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Patient Details</p>
              <h3 className="text-sm font-bold text-slate-900">
                {prescription.patient_first_name} {prescription.patient_last_name}
              </h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-slate-600">
                <p>Reg No: <strong className="text-slate-800">{prescription.patient_registration_number}</strong></p>
                <p>Age / Gender: <strong className="text-slate-800">{prescription.patient_age} yrs / {prescription.patient_gender}</strong></p>
                <p>Blood Group: <strong className="text-rose-700">{prescription.blood_group || 'N/A'}</strong></p>
                <p>Contact: <strong className="text-slate-800">{prescription.patient_mobile || 'N/A'}</strong></p>
              </div>
            </div>
          </div>

          {/* Patient Vitals Bar */}
          {(prescription.blood_pressure || prescription.temperature || prescription.weight || prescription.height) && (
            <div className="flex flex-wrap gap-4 items-center bg-teal-50/70 border border-teal-200/80 px-4 py-2.5 rounded-xl mb-6 text-xs text-slate-700">
              <span className="font-bold text-teal-900 uppercase tracking-wide text-[10px]">Patient Vitals:</span>
              {prescription.blood_pressure && <span>BP: <strong>{prescription.blood_pressure}</strong></span>}
              {prescription.temperature && <span>Temp: <strong>{prescription.temperature}</strong></span>}
              {prescription.pulse && <span>Pulse: <strong>{prescription.pulse} bpm</strong></span>}
              {prescription.weight && <span>Weight: <strong>{prescription.weight} kg</strong></span>}
              {prescription.height && <span>Height: <strong>{prescription.height} cm</strong></span>}
            </div>
          )}

          {/* Clinical Findings: Symptoms & Diagnosis */}
          <div className="space-y-3 mb-6 text-xs">
            {prescription.symptoms && (
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Chief Complaints / Symptoms: </span>
                <span className="text-slate-800">{prescription.symptoms}</span>
              </div>
            )}
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Provisional Diagnosis: </span>
              <span className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {prescription.diagnosis}
              </span>
            </div>
          </div>

          {/* Rx Prescribed Medicines Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl font-serif font-black text-hospital-700 italic">℞</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prescribed Medications</span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-y border-slate-300">
                  <th className="py-2 px-3 font-bold w-8">#</th>
                  <th className="py-2 px-3 font-bold">Medicine Name & Strength</th>
                  <th className="py-2 px-3 font-bold">Dosage</th>
                  <th className="py-2 px-3 font-bold">Frequency</th>
                  <th className="py-2 px-3 font-bold">Duration</th>
                  <th className="py-2 px-3 font-bold">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {medicines.map((med, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {med.medicine_name} <span className="font-normal text-slate-500 text-[11px]">({med.strength})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{med.dosage}</td>
                    <td className="py-2.5 px-3 text-slate-700">{med.frequency}</td>
                    <td className="py-2.5 px-3 text-slate-700">{med.duration}</td>
                    <td className="py-2.5 px-3 text-hospital-700 font-medium">{med.instructions || 'As directed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advice & Follow-up */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-8 text-xs space-y-2">
            {prescription.advice && (
              <div>
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-0.5">Advice / Precautions:</p>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{prescription.advice}</p>
              </div>
            )}
            {prescription.follow_up_date && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">Next Follow-up Review:</span>
                <span className="font-bold text-hospital-700 text-sm bg-hospital-50 px-2 py-0.5 rounded border border-hospital-200">
                  {prescription.follow_up_date}
                </span>
              </div>
            )}
          </div>

          {/* Doctor Signature Block */}
          <div className="flex justify-between items-end pt-8 border-t border-slate-300">
            <div className="text-[10px] text-slate-400 max-w-xs">
              <p>Generated electronically by OPD Management System.</p>
              <p>Valid without physical stamp when generated from verified doctor portal.</p>
            </div>
            <div className="text-center">
              <div className="w-48 h-12 border-b border-dashed border-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-900">
                Dr. {prescription.doctor_first_name} {prescription.doctor_last_name}
              </p>
              <p className="text-[11px] text-slate-500">Authorized Medical Practitioner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
