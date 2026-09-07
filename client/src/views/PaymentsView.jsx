import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ReceiptPrint from '../components/PrintTemplates/ReceiptPrint';
import {
  Receipt,
  Search,
  Printer,
  CreditCard,
  PlusCircle,
  IndianRupee,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function PaymentsView({ preselectedBill, onClearPreselectedBill }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Print Receipt State
  const [printReceiptData, setPrintReceiptData] = useState(null);

  // Collect Payment Modal State
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [pendingBills, setPendingBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [payForm, setPayForm] = useState({
    bill_id: '',
    amount: '',
    payment_method: 'Cash',
    transaction_reference: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch payments list
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments({
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        payment_method: paymentMethod || undefined,
        page,
        limit: 10
      });
      setPayments(res.payments || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, dateFrom, dateTo, paymentMethod, page]);

  // Handle preselected bill passed from BillingView
  useEffect(() => {
    if (preselectedBill) {
      setSelectedBill(preselectedBill);
      setPayForm({
        bill_id: preselectedBill.id,
        amount: String(preselectedBill.balance_amount),
        payment_method: 'UPI',
        transaction_reference: ''
      });
      setIsCollectOpen(true);
      if (onClearPreselectedBill) onClearPreselectedBill();
    }
  }, [preselectedBill]);

  // Open collect modal & fetch pending bills
  const handleOpenCollect = async () => {
    try {
      const res = await api.getBills({ limit: 50 });
      const pending = (res.bills || []).filter(b => b.payment_status !== 'Paid' && b.balance_amount > 0);
      setPendingBills(pending);
      if (pending.length > 0) {
        setSelectedBill(pending[0]);
        setPayForm({
          bill_id: pending[0].id,
          amount: String(pending[0].balance_amount),
          payment_method: 'Cash',
          transaction_reference: ''
        });
      }
      setIsCollectOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBillSelect = (billId) => {
    const b = pendingBills.find(item => item.id === Number(billId));
    setSelectedBill(b || null);
    if (b) {
      setPayForm(prev => ({
        ...prev,
        bill_id: b.id,
        amount: String(b.balance_amount)
      }));
    }
  };

  // Submit payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payForm.bill_id || !payForm.amount) {
      showToast('Please specify bill and valid payment amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.recordPayment(payForm);
      showToast(`Payment recorded! Receipt No: ${res.payment.receipt_number}`);
      setIsCollectOpen(false);
      fetchPayments();

      // Open print preview of receipt
      const receiptRes = await api.getPaymentReceipt(res.payment.id);
      setPrintReceiptData(receiptRes);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Print existing receipt
  const handlePrintReceipt = async (paymentId) => {
    try {
      const res = await api.getPaymentReceipt(paymentId);
      setPrintReceiptData(res);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payments & Receipts</h2>
          <p className="text-xs text-slate-500">
            Accept Cash, UPI, Card, and Bank payments, issue verified receipts, and reconcile cashier books
          </p>
        </div>

        {user?.role !== 'doctor' && (
          <button
            onClick={handleOpenCollect}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Collect OPD Payment
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-600 block mb-1">Search Receipts</label>
          <input
            type="text"
            placeholder="Receipt #, Bill #, Patient..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="font-bold text-slate-600 block mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="font-bold text-slate-600 block mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="font-bold text-slate-600 block mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={e => { setPaymentMethod(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
          >
            <option value="">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Bill Reference</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Amount Received (₹)</th>
                <th className="py-3.5 px-4">Received By</th>
                <th className="py-3.5 px-4 text-right">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading payment ledger...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">No payment receipts found.</td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {p.receipt_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.payment_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.bill_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.patient_first_name} {p.patient_last_name}
                      <p className="font-normal font-mono text-[11px] text-slate-400">{p.patient_registration_number}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">
                        {p.payment_method}
                      </span>
                      {p.transaction_reference && (
                        <p className="text-[10px] font-mono text-slate-400 truncate max-w-xs">{p.transaction_reference}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-700 text-right text-sm">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.receiver_name || 'Front Desk'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handlePrintReceipt(p.id)}
                        title="Print Official Payment Receipt"
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-hospital-700 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {payments.length} of {totalCount} receipts</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* COLLECT PAYMENT MODAL */}
      <Modal
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        title="Collect Outpatient Payment"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Pending Bill *</label>
            <select
              required
              value={payForm.bill_id}
              onChange={e => handleBillSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="">Select Bill...</option>
              {pendingBills.map(b => (
                <option key={b.id} value={b.id}>
                  {b.bill_number} - {b.patient_first_name} {b.patient_last_name} (Due: ₹{b.balance_amount})
                </option>
              ))}
            </select>
          </div>

          {/* Bill Summary Preview */}
          {selectedBill && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Invoiced</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">₹{selectedBill.total_amount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Already Paid</p>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">₹{selectedBill.paid_amount || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-rose-600 font-bold uppercase">Balance Due</p>
                <p className="font-black text-rose-600 text-sm mt-0.5">₹{selectedBill.balance_amount}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                max={selectedBill ? selectedBill.balance_amount : undefined}
                value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-bold text-sm"
              />
              {selectedBill && (
                <button
                  type="button"
                  onClick={() => setPayForm({ ...payForm, amount: String(selectedBill.balance_amount) })}
                  className="mt-1 text-[11px] text-hospital-700 hover:text-hospital-800 font-semibold underline"
                >
                  Pay Full Balance (₹{selectedBill.balance_amount})
                </button>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Method *</label>
              <select
                value={payForm.payment_method}
                onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-semibold"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Transaction Reference / UTR Number</label>
            <input
              type="text"
              placeholder="e.g. UPI/49012389102 or Card Auth 88921"
              value={payForm.transaction_reference}
              onChange={e => setPayForm({ ...payForm, transaction_reference: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCollectOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Collect & Issue Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINT RECEIPT MODAL */}
      {printReceiptData && (
        <ReceiptPrint
          data={printReceiptData}
          onClose={() => setPrintReceiptData(null)}
        />
      )}
    </div>
  );
}
