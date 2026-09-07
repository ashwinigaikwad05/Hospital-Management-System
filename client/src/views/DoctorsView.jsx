import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import {
  Stethoscope,
  Plus,
  Edit2,
  Search,
  Phone,
  Mail,
  Building2,
  IndianRupee,
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function DoctorsView() {
  const { showToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  const initialForm = {
    doctor_code: '',
    first_name: '',
    last_name: '',
    gender: 'Male',
    mobile_number: '',
    email: '',
    department_id: '',
    specialization: '',
    qualification: '',
    experience: 5,
    consultation_fee: 500,
    registration_number: '',
    status: 'active',
    create_user_account: true,
    username: '',
    password: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchMetaAndDoctors = async () => {
    try {
      setLoading(true);
      const [deptRes, docRes] = await Promise.all([
        api.getDepartments(),
        api.getDoctors(filterDept ? { department_id: filterDept } : {})
      ]);
      setDepartments(deptRes.departments || []);
      setDoctors(docRes.doctors || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetaAndDoctors();
  }, [filterDept]);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoctor(doc);
    setFormData({
      doctor_code: doc.doctor_code,
      first_name: doc.first_name,
      last_name: doc.last_name,
      gender: doc.gender || 'Male',
      mobile_number: doc.mobile_number,
      email: doc.email,
      department_id: doc.department_id,
      specialization: doc.specialization,
      qualification: doc.qualification,
      experience: doc.experience,
      consultation_fee: doc.consultation_fee,
      registration_number: doc.registration_number,
      status: doc.status,
      create_user_account: false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDoctor) {
        await api.updateDoctor(editingDoctor.id, formData);
        showToast('Doctor profile updated successfully');
      } else {
        await api.createDoctor(formData);
        showToast('Doctor profile and portal login created successfully');
      }
      setIsModalOpen(false);
      fetchMetaAndDoctors();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Doctor Management</h2>
          <p className="text-xs text-slate-500">
            Maintain clinical doctor profiles, department assignments, consultation fees, and medical licenses
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Doctor
        </button>
      </div>

      {/* Filter by Department */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 text-xs">
        <label className="font-bold text-slate-700">Filter Department:</label>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden font-medium text-slate-800"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.department_name}</option>
          ))}
        </select>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No doctor profiles found.</div>
        ) : (
          doctors.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-hospital-50 border border-hospital-200 text-hospital-700 flex items-center justify-center font-bold text-base">
                      {doc.first_name[0]}{doc.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Dr. {doc.first_name} {doc.last_name}
                      </h3>
                      <p className="text-hospital-700 font-medium text-xs">{doc.department_name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    doc.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                  <p><strong className="text-slate-700">Specialization:</strong> {doc.specialization}</p>
                  <p><strong className="text-slate-700">Qualification:</strong> {doc.qualification}</p>
                  <p><strong className="text-slate-700">Experience:</strong> {doc.experience} Years</p>
                  <p className="font-mono text-[11px] text-slate-500">Reg No: {doc.registration_number}</p>
                  <p className="text-slate-500 flex items-center gap-1.5 pt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {doc.mobile_number}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Consultation Fee</span>
                  <span className="text-base font-black text-hospital-900">₹{doc.consultation_fee}</span>
                </div>
                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDoctor ? `Edit Profile: Dr. ${editingDoctor.first_name} ${editingDoctor.last_name}` : 'Register New Doctor Profile'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Doctor Code *</label>
              <input
                type="text"
                required
                disabled={!!editingDoctor}
                placeholder="e.g. DOC-CRD-09"
                value={formData.doctor_code}
                onChange={e => setFormData({ ...formData, doctor_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden uppercase disabled:bg-slate-100"
              />
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Department *</label>
              <select
                required
                value={formData.department_id}
                onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              >
                <option value="">Select Department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.department_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Consultation Fee (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.consultation_fee}
                onChange={e => setFormData({ ...formData, consultation_fee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Medical Registration No *</label>
              <input
                type="text"
                required
                placeholder="e.g. MCI-CARD-8902"
                value={formData.registration_number}
                onChange={e => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Specialization *</label>
              <input
                type="text"
                required
                placeholder="e.g. Interventional Cardiology, Spine Surgery..."
                value={formData.specialization}
                onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Qualifications *</label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, MD, DM"
                value={formData.qualification}
                onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Experience (Years)</label>
              <input
                type="number"
                value={formData.experience}
                onChange={e => setFormData({ ...formData, experience: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
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
              <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Account Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {!editingDoctor && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="font-bold text-slate-800">Doctor Portal Login Credentials</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Username (e.g. dr.sharma)"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="password"
                  placeholder="Password (default: doctor123)"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-hospital-600 hover:bg-hospital-700 text-white font-bold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (editingDoctor ? 'Save Changes' : 'Create Doctor')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
