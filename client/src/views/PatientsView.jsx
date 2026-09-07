import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Clock,
  FileText,
  CreditCard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function PatientsView({ onBookAppointment }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const initialForm = {
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    date_of_birth: '',
    age: '',
    mobile_number: '',
    alternate_mobile_number: '',
    email: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    blood_group: 'B+',
    emergency_contact_name: '',
    emergency_contact_number: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate age when DOB changes
  const handleDobChange = (dob) => {
    let calculatedAge = '';
    if (dob) {
      const birth = new Date(dob);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    setFormData(prev => ({
      ...prev,
      date_of_birth: dob,
      age: calculatedAge
    }));
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.getPatients({ search, page, limit: 10 });
      setPatients(res.patients || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, page]);

  const handleOpenDetails = async (patient) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.getPatient(patient.id);
      setPatientHistory(res);
    } catch (err) {
      showToast('Failed to load patient history: ' + err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenEdit = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      first_name: patient.first_name || '',
      middle_name: patient.middle_name || '',
      last_name: patient.last_name || '',
      gender: patient.gender || 'Male',
      date_of_birth: patient.date_of_birth || '',
      age: patient.age || '',
      mobile_number: patient.mobile_number || '',
      alternate_mobile_number: patient.alternate_mobile_number || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      state: patient.state || '',
      pincode: patient.pincode || '',
      blood_group: patient.blood_group || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_number: patient.emergency_contact_number || ''
    });
    setIsEditOpen(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createPatient(formData);
      showToast(`Patient registered successfully! Assigned Reg No: ${res.patient.patient_registration_number}`);
      setIsRegisterOpen(false);
      setFormData(initialForm);
      fetchPatients();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      await api.updatePatient(selectedPatient.id, formData);
      showToast('Patient record updated successfully');
      setIsEditOpen(false);
      fetchPatients();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Management</h2>
          <p className="text-xs text-slate-500">
            Register new outpatient files, search demographics, and inspect longitudinal medical records
          </p>
        </div>

        {user?.role !== 'doctor' && (
          <button
            onClick={() => {
              setFormData(initialForm);
              setIsRegisterOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Register New Patient
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by Patient Registration No (e.g. PAT-2026-0001), Name, or Mobile Number..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 rounded-md"
          >
            Clear
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Reg Number</th>
                <th className="py-3.5 px-4">Patient Name</th>
                <th className="py-3.5 px-4">Age / Gender</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4">Blood Group</th>
                <th className="py-3.5 px-4">City / State</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-hospital-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Searching patient directory...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No matching patient records found. Click "Register New Patient" above to add one.
                  </td>
                </tr>
              ) : (
                patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-hospital-700">
                      {pat.patient_registration_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {pat.first_name} {pat.middle_name ? pat.middle_name + ' ' : ''}{pat.last_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {pat.age} yrs / <span className="text-slate-500">{pat.gender}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <p className="font-semibold text-slate-800">{pat.mobile_number}</p>
                      {pat.email && <p className="text-[11px] text-slate-400">{pat.email}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {pat.blood_group || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pat.city}, {pat.state}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(pat)}
                          title="View Medical History & Profile"
                          className="p-1.5 rounded-lg text-hospital-700 hover:bg-hospital-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user?.role !== 'doctor' && (
                          <button
                            onClick={() => handleOpenEdit(pat)}
                            title="Edit Patient Info"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onBookAppointment && user?.role !== 'doctor' && (
                          <button
                            onClick={() => onBookAppointment(pat)}
                            className="px-2.5 py-1 bg-hospital-50 hover:bg-hospital-100 text-hospital-700 font-semibold rounded-lg text-[11px] transition-colors border border-hospital-200"
                          >
                            Book OPD
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
          <span>Showing {patients.length} of {totalCount} patients</span>
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

      {/* REGISTRATION & EDIT MODAL */}
      <Modal
        isOpen={isRegisterOpen || isEditOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? `Edit Patient: ${selectedPatient?.patient_registration_number}` : 'New Outpatient Registration'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={isEditOpen ? handleEditSubmit : handleRegisterSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Middle Name</label>
              <input
                type="text"
                value={formData.middle_name}
                onChange={e => setFormData({ ...formData, middle_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.date_of_birth}
                onChange={e => handleDobChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Age (Years) *</label>
              <input
                type="number"
                required
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden bg-slate-50"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              >
                <option value="">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Number (10 Digits) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="10-digit mobile"
                value={formData.mobile_number}
                onChange={e => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alternate Mobile (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit alternate"
                value={formData.alternate_mobile_number}
                onChange={e => setFormData({ ...formData, alternate_mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="patient@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Address *</label>
            <input
              type="text"
              required
              placeholder="Flat/House, Street, Area"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pincode *</label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Emergency Contact Person</label>
              <input
                type="text"
                placeholder="Relative / Guardian Name"
                value={formData.emergency_contact_name}
                onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Emergency Contact Number (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={formData.emergency_contact_number}
                onChange={e => setFormData({ ...formData, emergency_contact_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsRegisterOpen(false);
                setIsEditOpen(false);
              }}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (isEditOpen ? 'Update Patient' : 'Register Patient')}
            </button>
          </div>
        </form>
      </Modal>

      {/* PATIENT DETAILS & COMPLETE HISTORY MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Patient Record: ${selectedPatient?.patient_registration_number}`}
        maxWidth="max-w-4xl"
      >
        {loadingHistory ? (
          <div className="py-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-hospital-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading complete patient medical record...
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Patient Header Banner */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Full Name</p>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedPatient?.first_name} {selectedPatient?.middle_name} {selectedPatient?.last_name}
                </h4>
                <p className="text-hospital-700 font-mono font-semibold">{selectedPatient?.patient_registration_number}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Demographics</p>
                <p className="text-slate-800 font-medium">Age: {selectedPatient?.age} yrs | Gender: {selectedPatient?.gender}</p>
                <p className="text-rose-700 font-semibold">Blood Group: {selectedPatient?.blood_group || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Contact</p>
                <p className="text-slate-800 font-medium">Phone: {selectedPatient?.mobile_number}</p>
                <p className="text-slate-500">{selectedPatient?.address}, {selectedPatient?.city}</p>
              </div>
            </div>

            {/* Medical History Tabs */}
            <div className="space-y-4">
              {/* Consultations History */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <HeartPulse className="w-4 h-4 text-hospital-600" /> Past Consultations & Clinical Diagnoses ({patientHistory?.consultations?.length || 0})
                </h4>

                {patientHistory?.consultations?.length === 0 ? (
                  <p className="text-slate-400 italic bg-slate-50 p-4 rounded-xl">No previous clinical consultations recorded for this patient.</p>
                ) : (
                  <div className="space-y-3">
                    {patientHistory?.consultations?.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">Dr. {c.doctor_first_name} {c.doctor_last_name}</span>
                            <span className="text-slate-500 ml-2">({c.specialization})</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">{c.created_at}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {c.blood_pressure && <span>BP: <strong>{c.blood_pressure}</strong></span>}
                          {c.temperature && <span>Temp: <strong>{c.temperature}</strong></span>}
                          {c.weight && <span>Weight: <strong>{c.weight} kg</strong></span>}
                          {c.height && <span>Height: <strong>{c.height} cm</strong></span>}
                        </div>
                        <p><strong className="text-slate-700">Diagnosis:</strong> <span className="font-semibold text-slate-900">{c.diagnosis}</span></p>
                        {c.symptoms && <p><strong className="text-slate-700">Symptoms:</strong> {c.symptoms}</p>}
                        {c.advice && <p><strong className="text-slate-700">Advice:</strong> {c.advice}</p>}

                        {/* Prescribed Medicines */}
                        {c.prescription?.medicines?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="font-bold text-hospital-800 text-[11px] mb-1">Prescribed Medicines (Rx):</p>
                            <div className="flex flex-wrap gap-2">
                              {c.prescription.medicines.map((m, mIdx) => (
                                <span key={mIdx} className="px-2 py-1 rounded-md bg-hospital-50 border border-hospital-200 text-hospital-800 text-[11px]">
                                  {m.medicine_name} ({m.strength}) - {m.dosage} [{m.frequency}]
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Appointments History */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-hospital-600" /> Past Appointments ({patientHistory?.appointments?.length || 0})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                        <th className="py-2 px-3">Appt No</th>
                        <th className="py-2 px-3">Doctor</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Date & Time</th>
                        <th className="py-2 px-3">Token #</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patientHistory?.appointments?.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{a.appointment_number}</td>
                          <td className="py-2 px-3">Dr. {a.doctor_first_name} {a.doctor_last_name}</td>
                          <td className="py-2 px-3">{a.department_name}</td>
                          <td className="py-2 px-3">{a.appointment_date} at {a.appointment_time}</td>
                          <td className="py-2 px-3 font-bold text-hospital-700">#{a.token_number}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
