import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';

export default function ReceiptPrint({ data, onClose }) {
  if (!data || !data.receipt) return null;

  const { receipt, hospital = {} } = data;
  const currency = hospital.currency_symbol || '₹';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto print-sheet">
        {/* Print Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white no-print">
          <span className="text-sm font-semibold flex items-center gap-2">
            🧾 Official Payment Receipt Preview
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-hospital-600 hover:bg-hospital-500 rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Receipt */}
        <div className="p-8 sm:p-10 text-slate-900 bg-white border-8 border-slate-100 m-2">
          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-5 mb-6">
            <h1 className="text-xl font-black text-hospital-800 uppercase tracking-tight">
              {hospital.hospital_name || 'OPD Management System'}
            </h1>
            <p className="text-xs text-slate-500">{hospital.address}</p>
            <p className="text-xs text-slate-500">Phone: {hospital.phone}</p>
            <div className="inline-block mt-3 px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
              Official Payment Receipt
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div>
              <p className="text-slate-500">Receipt No: <strong className="text-slate-900">{receipt.receipt_number}</strong></p>
              <p className="text-slate-500 mt-1">Date & Time: <strong className="text-slate-900">{receipt.payment_date}</strong></p>
              <p className="text-slate-500 mt-1">Bill Reference: <strong className="text-slate-900">{receipt.bill_number}</strong></p>
            </div>
            <div>
              <p className="text-slate-500">Patient: <strong className="text-slate-900">{receipt.patient_first_name} {receipt.patient_last_name}</strong></p>
              <p className="text-slate-500 mt-1">Reg No: <strong className="text-slate-900">{receipt.patient_registration_number}</strong></p>
              <p className="text-slate-500 mt-1">Doctor: <strong className="text-slate-900">Dr. {receipt.doctor_first_name} {receipt.doctor_last_name}</strong></p>
            </div>
          </div>

          {/* Payment Details Box */}
          <div className="border border-slate-200 rounded-xl p-5 mb-6 bg-emerald-50/30">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-sm">
              <span className="font-semibold text-slate-700">Amount Received:</span>
              <span className="text-2xl font-black text-emerald-700">
                {currency}{Number(receipt.amount).toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs pt-3 text-slate-600">
              <div>
                <p>Payment Mode: <strong className="text-slate-900 uppercase">{receipt.payment_method}</strong></p>
                {receipt.transaction_reference && (
                  <p className="mt-1">Transaction Ref: <strong className="font-mono text-slate-900">{receipt.transaction_reference}</strong></p>
                )}
              </div>
              <div className="text-right">
                <p>Bill Total: <strong>{currency}{Number(receipt.bill_total).toFixed(2)}</strong></p>
                <p className="mt-1">Remaining Balance: <strong className={receipt.bill_remaining_balance > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {currency}{Number(receipt.bill_remaining_balance).toFixed(2)}
                </strong></p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-8 border-t border-dashed border-slate-300 text-xs">
            <div className="text-[10px] text-slate-400">
              <p>Received with thanks.</p>
              <p>Computer generated receipt.</p>
            </div>
            <div className="text-center">
              <div className="w-36 h-8 border-b border-slate-400 mb-1" />
              <p className="font-bold text-slate-800">{receipt.receiver_name || 'Cashier / Reception Desk'}</p>
              <p className="text-[10px] text-slate-400">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
