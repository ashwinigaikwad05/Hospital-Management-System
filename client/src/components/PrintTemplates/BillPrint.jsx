import React from 'react';
import { Printer, X, CheckCircle2, Clock } from 'lucide-react';

export default function BillPrint({ data, onClose }) {
  if (!data || !data.bill) return null;

  const { bill, hospital = {} } = data;
  const currency = hospital.currency_symbol || '₹';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto print-sheet">
        {/* Print Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white no-print">
          <span className="text-sm font-semibold flex items-center gap-2">
            🧾 OPD Consultation Invoice Preview
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-hospital-600 hover:bg-hospital-500 rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Bill
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Invoice */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {hospital.hospital_name || 'OPD Management System'}
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mt-0.5">{hospital.address}</p>
              <p className="text-xs text-slate-500">Phone: {hospital.phone} | GSTIN: {hospital.gst_number || 'N/A'}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-md tracking-wider">
                OPD Billing Invoice
              </span>
              <p className="text-xs text-slate-500 mt-2">Bill No: <strong className="text-slate-900">{bill.bill_number}</strong></p>
              <p className="text-xs text-slate-500">Date: <strong className="text-slate-900">{bill.bill_date}</strong></p>
            </div>
          </div>

          {/* Details Table */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Patient Details</p>
              <p className="font-bold text-slate-900 text-sm">{bill.patient_first_name} {bill.patient_last_name}</p>
              <p className="text-slate-600">Reg No: <strong>{bill.patient_registration_number}</strong></p>
              <p className="text-slate-600">Age/Gender: {bill.patient_age} yrs / {bill.patient_gender}</p>
              <p className="text-slate-600">Mobile: {bill.patient_mobile}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Appointment & Doctor</p>
              <p className="text-slate-700">Appt No: <strong className="text-slate-900">{bill.appointment_number}</strong></p>
              <p className="text-slate-700">Doctor: <strong>Dr. {bill.doctor_first_name} {bill.doctor_last_name}</strong></p>
              <p className="text-slate-600">Department: {bill.department_name}</p>
              <p className="text-slate-600">Specialization: {bill.specialization}</p>
            </div>
          </div>

          {/* Charges Table */}
          <table className="w-full text-xs text-left mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300 text-slate-700">
                <th className="py-2.5 px-4 font-bold">Item / Description</th>
                <th className="py-2.5 px-4 font-bold text-right">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-900">Doctor Outpatient Consultation Fee</p>
                  <p className="text-slate-500 text-[11px]">Primary diagnostic assessment & consultation</p>
                </td>
                <td className="py-3 px-4 font-bold text-slate-900 text-right">
                  {currency}{Number(bill.consultation_fee).toFixed(2)}
                </td>
              </tr>
              {Number(bill.additional_charges) > 0 && (
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">Additional Clinical Services & Diagnostics</p>
                    <p className="text-slate-500 text-[11px]">Procedures / nursing / vitals monitoring</p>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 text-right">
                    {currency}{Number(bill.additional_charges).toFixed(2)}
                  </td>
                </tr>
              )}
              {Number(bill.discount) > 0 && (
                <tr className="text-emerald-700 bg-emerald-50/50">
                  <td className="py-2.5 px-4 font-semibold">Special Concession / Healthcare Discount</td>
                  <td className="py-2.5 px-4 font-bold text-right">
                    -{currency}{Number(bill.discount).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total & Summary Block */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{currency}{(Number(bill.consultation_fee) + Number(bill.additional_charges)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span className="font-semibold text-emerald-700">-{currency}{Number(bill.discount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                <span>Total Net Amount:</span>
                <span>{currency}{Number(bill.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-1">
                <span>Paid Amount:</span>
                <span className="font-bold text-emerald-700">{currency}{Number(bill.paid_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                <span>Balance Due:</span>
                <span className={bill.balance_amount > 0 ? 'text-rose-600' : 'text-slate-900'}>
                  {currency}{Number(bill.balance_amount).toFixed(2)}
                </span>
              </div>
              <div className="pt-2">
                <span className={`inline-block w-full text-center py-1 rounded-md text-[11px] font-bold uppercase ${
                  bill.payment_status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : bill.payment_status === 'Partially Paid'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  Status: {bill.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-xs">
            <div className="text-[10px] text-slate-400">
              <p>Thank you for choosing OPD Management System.</p>
              <p>Generated by: {bill.biller_name || 'Accounts Desk'}</p>
            </div>
            <div className="text-center">
              <div className="w-40 h-10 border-b border-slate-400 mb-1" />
              <p className="font-bold text-slate-800">Authorized Billing Officer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
