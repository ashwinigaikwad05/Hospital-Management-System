import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Calendar,
  Clock,
  UserCheck,
  CalendarDays,
  PlusCircle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Stethoscope,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AppointmentsView({ preselectedPatient, onClearPreselectedPatient }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Departments & Doctors lists
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Modals
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);

  // Booking Form State
  const initialBooking = {
    patient_id: preselectedPatient?.id || '',
    patient_name: preselectedPatient ? `${preselectedPatient.first_name} ${preselectedPatient.last_name} (${preselectedPatient.patient_registration_number})` : '',
    department_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00',
    appointment_type: 'New Visit',
    reason_for_visit: '',
    auto_check_in: true
  };
  const [bookingForm, setBookingForm] = useState(initialBooking);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState({
    appointment_date: '',
    appointment_time: ''
  });

  // Cancel Reason State
  const [cancelReason, setCancelReason] = useState('');

  // Fetch departments and doctors
  useEffect(() => {
    async function loadMeta() {
      try {
        const [deptRes, docRes] = await Promise.all([
          api.getDepartments(),
          api.getDoctors()
        ]);
        setDepartments(deptRes.departments || []);
        setDoctors(docRes.doctors || []);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Handle preselected patient passed from patients view
  useEffect(() => {
    if (preselectedPatient) {
      setBookingForm(prev => ({
        ...prev,
        patient_id: preselectedPatient.id,
        patient_name: `${preselectedPatient.first_name} ${preselectedPatient.last_name} (${preselectedPatient.patient_registration_number})`
      }));
      setIsBookOpen(true);
      if (onClearPreselectedPatient) onClearPreselectedPatient();
    }
  }, [preselectedPatient]);

  // Fetch appointments list
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.getAppointments({
        date: filterDate || undefined,
        doctor_id: filterDoctor || undefined,
        department_id: filterDept || undefined,
        status: filterStatus || undefined,
        search: search || undefined,
        page,
        limit: 10
      });
      setAppointments(res.appointments || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterDoctor, filterDept, filterStatus, search, page]);

  // Search patients inside booking modal
  const handlePatientSearch = async (q) => {
    setPatientSearchQuery(q);
    if (!q.trim()) {
      setPatientSearchResults([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const res = await api.getPatients({ search: q, limit: 5 });
      setPatientSearchResults(res.patients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatient = (p) => {
    setBookingForm(prev => ({
      ...prev,
      patient_id: p.id,
      patient_name: `${p.first_name} ${p.last_name} (${p.patient_registration_number})`
    }));
    setPatientSearchQuery('');
    setPatientSearchResults([]);
  };

  // Doctors filtered by selected department
  const filteredDoctorsForBooking = bookingForm.department_id
    ? doctors.filter(d => d.department_id === Number(bookingForm.department_id))
    : doctors;

  // Selected doctor fee preview
  const selectedDoctorInfo = doctors.find(d => d.id === Number(bookingForm.doctor_id));

  // Submit new appointment
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingForm.patient_id) {
      showToast('Please search and select a registered patient.', 'error');
      return;
    }
    if (!bookingForm.department_id || !bookingForm.doctor_id) {
      showToast('Please select both Department and Doctor.', 'error');
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await api.createAppointment(bookingForm);
      showToast(`Appointment booked successfully! Token #${res.appointment.token_number} (${res.appointment.appointment_number})`);
      setIsBookOpen(false);
      setBookingForm(initialBooking);
      fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Check in
  const handleCheckIn = async (apt) => {
    try {
      await api.checkInAppointment(apt.id);
      showToast(`Patient checked in! Placed in Doctor queue as Token #${apt.token_number}`);
      fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Reschedule
  const handleOpenReschedule = (apt) => {
    setSelectedApt(apt);
    setRescheduleData({
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time
    });
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApt) return;
    try {
      const res = await api.rescheduleAppointment(selectedApt.id, rescheduleData);
      showToast(res.message);
      setIsRescheduleOpen(false);
      fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Cancel
  const handleOpenCancel = (apt) => {
    setSelectedApt(apt);
    setCancelReason('');
    setIsCancelOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedApt) return;
    try {
      await api.cancelAppointment(selectedApt.id, { cancellation_reason: cancelReason });
      showToast('Appointment cancelled successfully');
      setIsCancelOpen(false);
      fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Booked': 'bg-blue-50 text-blue-700 border-blue-200',
      'Checked-In': 'bg-amber-50 text-amber-700 border-amber-200',
      'Waiting': 'bg-amber-50 text-amber-700 border-amber-200',
      'In Consultation': 'bg-purple-50 text-purple-700 border-purple-200',
      'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
      'No Show': 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[status] || styles['Booked']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Appointment Center</h2>
          <p className="text-xs text-slate-500">
            Schedule outpatient visits, generate doctor-wise daily tokens, check-in arrivals, and manage schedules
          </p>
        </div>

        {user?.role !== 'doctor' && (
          <button
            onClick={() => {
              setBookingForm(initialBooking);
              setIsBookOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Book New Appointment
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Appt #, Reg #, Name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">Appointment Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">Department</label>
            <select
              value={filterDept}
              onChange={e => { setFilterDept(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.department_name}</option>
              ))}
            </select>
          </div>

          {/* Doctor Filter */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">Doctor</label>
            <select
              value={filterDoctor}
              onChange={e => { setFilterDoctor(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="">All Doctors</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>Dr. {doc.first_name} {doc.last_name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="Booked">Booked</option>
              <option value="Waiting">Waiting (Checked-In)</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Quick Date Shortcuts */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold">Quick Dates:</span>
          <button
            onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterDate === new Date().toISOString().split('T')[0]
                ? 'bg-hospital-100 text-hospital-800 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              const tmrw = new Date();
              tmrw.setDate(tmrw.getDate() + 1);
              setFilterDate(tmrw.toISOString().split('T')[0]);
            }}
            className="px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Tomorrow
          </button>
          <button
            onClick={() => setFilterDate('')}
            className={`px-2.5 py-1 rounded-lg font-medium ${!filterDate ? 'bg-hospital-100 text-hospital-800 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Dates
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Token #</th>
                <th className="py-3.5 px-4">Appointment #</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Doctor & Specialty</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-hospital-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No appointments found matching your selected criteria.
                  </td>
                </tr>
              ) : (
                appointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold bg-hospital-50 text-hospital-800 border border-hospital-200">
                        #{apt.token_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {apt.appointment_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{apt.patient_first_name} {apt.patient_last_name}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{apt.patient_registration_number} | {apt.patient_mobile}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">Dr. {apt.doctor_first_name} {apt.doctor_last_name}</p>
                      <p className="text-hospital-700 text-[11px]">{apt.department_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <p className="font-semibold">{apt.appointment_date}</p>
                      <p className="text-slate-500 text-[11px]">{apt.appointment_time}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600 font-medium">{apt.appointment_type}</span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(apt.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Check-In Button */}
                        {apt.status === 'Booked' && user?.role !== 'doctor' && (
                          <button
                            onClick={() => handleCheckIn(apt)}
                            title="Check-In Patient to Queue"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                          >
                            Check-In
                          </button>
                        )}

                        {/* Reschedule Button */}
                        {!['Completed', 'In Consultation', 'Cancelled'].includes(apt.status) && user?.role !== 'doctor' && (
                          <button
                            onClick={() => handleOpenReschedule(apt)}
                            title="Reschedule Date/Time"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Cancel Button */}
                        {!['Completed', 'In Consultation', 'Cancelled'].includes(apt.status) && user?.role !== 'doctor' && (
                          <button
                            onClick={() => handleOpenCancel(apt)}
                            title="Cancel Appointment"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
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
          <span>Showing {appointments.length} of {totalCount} appointments</span>
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

      {/* BOOKING MODAL */}
      <Modal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        title="Schedule OPD Appointment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
          {/* Patient Selection Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 block">Select Registered Patient *</label>
            {bookingForm.patient_id ? (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-hospital-300">
                <span className="font-bold text-slate-900">{bookingForm.patient_name}</span>
                <button
                  type="button"
                  onClick={() => setBookingForm(prev => ({ ...prev, patient_id: '', patient_name: '' }))}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Change Patient
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Search patient by registration # (PAT-...) or name or phone..."
                  value={patientSearchQuery}
                  onChange={e => handlePatientSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden bg-white"
                />
                {patientSearchResults.length > 0 && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {patientSearchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-2.5 hover:bg-hospital-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.first_name} {p.last_name}</p>
                          <p className="text-[11px] text-slate-500">{p.patient_registration_number} | {p.mobile_number}</p>
                        </div>
                        <span className="text-[11px] font-bold text-hospital-700 bg-hospital-100 px-2 py-0.5 rounded">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Department & Doctor Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Department *</label>
              <select
                required
                value={bookingForm.department_id}
                onChange={e => setBookingForm({ ...bookingForm, department_id: e.target.value, doctor_id: '' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              >
                <option value="">Select Department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.department_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Doctor *</label>
              <select
                required
                disabled={!bookingForm.department_id}
                value={bookingForm.doctor_id}
                onChange={e => setBookingForm({ ...bookingForm, doctor_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden disabled:bg-slate-100"
              >
                <option value="">Select Doctor...</option>
                {filteredDoctorsForBooking.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.first_name} {doc.last_name} (₹{doc.consultation_fee})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor Info & Fee Preview */}
          {selectedDoctorInfo && (
            <div className="p-3 bg-hospital-50 border border-hospital-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-hospital-900">Dr. {selectedDoctorInfo.first_name} {selectedDoctorInfo.last_name}</p>
                <p className="text-hospital-700">{selectedDoctorInfo.specialization} ({selectedDoctorInfo.qualification})</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-hospital-600 uppercase font-bold">Consultation Fee</p>
                <p className="text-base font-black text-hospital-900">₹{selectedDoctorInfo.consultation_fee}</p>
              </div>
            </div>
          )}

          {/* Date, Time, Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Appointment Date *</label>
              <input
                type="date"
                required
                value={bookingForm.appointment_date}
                onChange={e => setBookingForm({ ...bookingForm, appointment_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Appointment Time *</label>
              <input
                type="time"
                required
                value={bookingForm.appointment_time}
                onChange={e => setBookingForm({ ...bookingForm, appointment_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Visit Type</label>
              <select
                value={bookingForm.appointment_type}
                onChange={e => setBookingForm({ ...bookingForm, appointment_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              >
                <option value="New Visit">New Visit</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Routine Checkup">Routine Checkup</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Reason for Visit / Chief Complaints</label>
            <textarea
              rows={2}
              placeholder="e.g. Chest discomfort, recurrent fever, joint pain..."
              value={bookingForm.reason_for_visit}
              onChange={e => setBookingForm({ ...bookingForm, reason_for_visit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          {/* Auto Check-in Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoCheckIn"
              checked={bookingForm.auto_check_in}
              onChange={e => setBookingForm({ ...bookingForm, auto_check_in: e.target.checked })}
              className="w-4 h-4 text-hospital-600 rounded"
            />
            <label htmlFor="autoCheckIn" className="text-slate-700 font-semibold cursor-pointer">
              Patient is present at desk — check-in immediately and allocate into Doctor's queue
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBookOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookingSubmitting}
              className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {bookingSubmitting ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title={`Reschedule Appointment: ${selectedApt?.appointment_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Rescheduling will allocate the next available sequential token for Dr. {selectedApt?.doctor_first_name} {selectedApt?.doctor_last_name} on the selected date.
          </p>

          <div>
            <label className="font-bold text-slate-700 block mb-1">New Appointment Date *</label>
            <input
              type="date"
              required
              value={rescheduleData.appointment_date}
              onChange={e => setRescheduleData({ ...rescheduleData, appointment_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">New Appointment Time *</label>
            <input
              type="time"
              required
              value={rescheduleData.appointment_time}
              onChange={e => setRescheduleData({ ...rescheduleData, appointment_time: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold"
            >
              Save New Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title={`Cancel Appointment: ${selectedApt?.appointment_number}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-rose-700 font-medium">
            Are you sure you want to cancel the appointment for <strong>{selectedApt?.patient_first_name} {selectedApt?.patient_last_name}</strong> (Token #{selectedApt?.token_number})?
          </p>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Cancellation Reason</label>
            <textarea
              rows={2}
              placeholder="e.g. Patient requested, unwell, rescheduled externally..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-rose-600 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCancelOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
