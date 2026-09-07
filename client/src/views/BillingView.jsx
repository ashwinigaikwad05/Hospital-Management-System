import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import BillPrint from '../components/PrintTemplates/BillPrint';
import {
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  Printer,
  Calendar,
  IndianRupee,
  Receipt,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function BillingView({ onCollectPayment }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // KPIs
  const [kpis, setKpis] = useState({ totalBilled: 0, totalPaid: 0, totalPending: 0 });

  // Print Bill State
  const [printBillData, setPrintBillData] = useState(null);

  // Create Bill Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [appointmentsWithoutBills, setAppointmentsWithoutBills] = useState([]);
  const [createForm, setCreateForm] = useState({
    appointment_id: '',
    consultation_fee: 0,
    additional_charges: 0,
    discount: 0,
    bill_date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch bills
  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.getBills({
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        payment_status: paymentStatus || undefined,
        page,
        limit: 10
      });
      setBills(res.bills || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);

      // Calculate totals
      let b = 0, p = 0, bal = 0;
      (res.bills || []).forEach(item => {
        b += Number(item.total_amount || 0);
        p += Number(item.paid_amount || 0);
        bal += Number(item.balance_amount || 0);
      });
      setKpis({ totalBilled: b, totalPaid: p, totalPending: bal });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [search, dateFrom, dateTo, paymentStatus, page]);

  // Load appointments that need billing
  const handleOpenCreate = async () => {
    try {
      const res = await api.getAppointments({ limit: 50 });
      // Find appointments without active bills
      const unbilled = (res.appointments || []).filter(a => a.status !== 'Cancelled');
      setAppointmentsWithoutBills(unbilled);
      if (unbilled.length > 0) {
        setCreateForm(prev => ({
          ...prev,
          appointment_id: unbilled[0].id,
          consultation_fee: unbilled[0].consultation_fee || 500
        }));
      }
      setIsCreateOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAppointmentSelect = (aptId) => {
    const apt = appointmentsWithoutBills.find(a => a.id === Number(aptId));
    setCreateForm(prev => ({
      ...prev,
      appointment_id: aptId,
      consultation_fee: apt ? apt.consultation_fee : 500
    }));
  };

  // Submit Create Bill
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createBill(createForm);
      showToast(`Bill created successfully! Bill No: ${res.bill.bill_number}`);
      setIsCreateOpen(false);
      fetchBills();

      // Open print preview
      const printRes = await api.getPrintBill(res.bill.id);
      setPrintBillData(printRes);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Print existing bill
  const handlePrintBill = async (billId) => {
    try {
      const res = await api.getPrintBill(billId);
      setPrintBillData(res);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const calculatedTotal = Math.max(
    0,
    Number(createForm.consultation_fee || 0) + Number(createForm.additional_charges || 0) - Number(createForm.discount || 0)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">OPD Billing Desk</h2>
          <p className="text-xs text-slate-500">
            Generate outpatient consultation invoices, apply clinical surcharges, discounts, and monitor collection statuses
          </p>
        </div>

        {user?.role !== 'doctor' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Generate New Bill
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Invoiced</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">₹{kpis.totalBilled.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Collected</p>
            <h3 className="text-xl font-bold text-emerald-700 mt-0.5">₹{kpis.totalPaid.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Outstanding Balance</p>
            <h3 className="text-xl font-bold text-rose-700 mt-0.5">₹{kpis.totalPending.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-600 block mb-1">Search Bills</label>
          <input
            type="text"
            placeholder="Bill #, Appt #, Patient Name..."
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
          <label className="font-bold text-slate-600 block mb-1">Payment Status</label>
          <select
            value={paymentStatus}
            onChange={e => { setPaymentStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid (Full)</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Bill Number</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Doctor</th>
                <th className="py-3.5 px-4 text-right">Total (₹)</th>
                <th className="py-3.5 px-4 text-right">Paid (₹)</th>
                <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">Loading bills...</td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">No billing records found.</td>
                </tr>
              ) : (
                bills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {b.bill_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {b.bill_date}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{b.patient_first_name} {b.patient_last_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{b.patient_registration_number}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      Dr. {b.doctor_first_name} {b.doctor_last_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-right">
                      ₹{Number(b.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 text-right">
                      ₹{Number(b.paid_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-right">
                      <span className={b.balance_amount > 0 ? 'text-rose-600' : 'text-slate-900'}>
                        ₹{Number(b.balance_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        b.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : b.payment_status === 'Partially Paid'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintBill(b.id)}
                          title="Print Bill / Invoice"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {b.payment_status !== 'Paid' && user?.role !== 'doctor' && (
                          <button
                            onClick={() => onCollectPayment && onCollectPayment(b)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {bills.length} of {totalCount} bills</span>
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

      {/* CREATE BILL MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate Outpatient Consultation Bill"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Patient Appointment *</label>
            <select
              required
              value={createForm.appointment_id}
              onChange={e => handleAppointmentSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="">Select Appointment...</option>
              {appointmentsWithoutBills.map(a => (
                <option key={a.id} value={a.id}>
                  {a.appointment_number} - {a.patient_first_name} {a.patient_last_name} (Dr. {a.doctor_first_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Consultation Fee (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={createForm.consultation_fee}
                onChange={e => setCreateForm({ ...createForm, consultation_fee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Additional Charges (₹)</label>
              <input
                type="number"
                step="0.01"
                value={createForm.additional_charges}
                onChange={e => setCreateForm({ ...createForm, additional_charges: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Discount / Concession (₹)</label>
              <input
                type="number"
                step="0.01"
                value={createForm.discount}
                onChange={e => setCreateForm({ ...createForm, discount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bill Date</label>
              <input
                type="date"
                required
                value={createForm.bill_date}
                onChange={e => setCreateForm({ ...createForm, bill_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Real-time Total Calculation Summary */}
          <div className="p-4 bg-hospital-50 border border-hospital-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="text-hospital-800 font-bold">Total Net Payable</p>
              <p className="text-slate-500 text-[11px]">Fee + Additional - Discount</p>
            </div>
            <span className="text-2xl font-black text-hospital-900">
              ₹{calculatedTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold disabled:opacity-50"
            >
              {submitting ? 'Generating...' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINT BILL MODAL */}
      {printBillData && (
        <BillPrint
          data={printBillData}
          onClose={() => setPrintBillData(null)}
        />
      )}
    </div>
  );
}
