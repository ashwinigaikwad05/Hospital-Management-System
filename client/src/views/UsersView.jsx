import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import {
  Users,
  UserPlus,
  Edit2,
  Shield,
  UserCheck,
  Stethoscope,
  Trash2,
  Key
} from 'lucide-react';

export default function UsersView() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'receptionist',
    full_name: '',
    email: '',
    mobile_number: '',
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'receptionist',
      full_name: '',
      email: '',
      mobile_number: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (name) => {
    setFormData(prev => {
      let suggestedUser = prev.username;
      if (!editingUser) {
        const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
        const prefix = prev.role === 'doctor' ? 'dr.' : '';
        suggestedUser = cleanName ? `${prefix}${cleanName}` : '';
      }
      return {
        ...prev,
        full_name: name,
        username: suggestedUser
      };
    });
  };

  const handleRoleChange = (newRole) => {
    setFormData(prev => {
      let user = prev.username;
      if (!editingUser && prev.full_name) {
        const cleanName = prev.full_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
        const prefix = newRole === 'doctor' ? 'dr.' : '';
        user = `${prefix}${cleanName}`;
      }
      return { ...prev, role: newRole, username: user };
    });
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '', // Blank unless resetting
      role: u.role,
      full_name: u.full_name,
      email: u.email,
      mobile_number: u.mobile_number || '',
      status: u.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        showToast('User updated successfully');
      } else {
        await api.createUser(formData);
        showToast('User account created successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (u) => {
    try {
      await api.deleteUser(u.id);
      showToast(`User ${u.username} deactivated.`);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-purple-600" />;
    if (role === 'doctor') return <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />;
    return <UserCheck className="w-3.5 h-3.5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff & User Management</h2>
          <p className="text-xs text-slate-500">
            Control role-based authentication permissions for Administrators, Doctors, and Receptionists
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add System User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-400">Loading users...</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {u.full_name}
                      {u.specialization && <p className="text-[11px] font-normal text-hospital-700">{u.specialization}</p>}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      @{u.username}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-800">
                        {getRoleIcon(u.role)}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 text-slate-600">{u.mobile_number || 'N/A'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(u)}
                            title="Deactivate Account"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit Account: @${editingUser.username}` : 'Create Staff Account'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs" autoComplete="off">
          {/* Prevent aggressive browser password managers from autofilling admin credentials */}
          <input type="text" style={{ display: 'none' }} tabIndex="-1" />
          <input type="password" style={{ display: 'none' }} tabIndex="-1" />

          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
            <input
              type="text"
              required
              autoComplete="off"
              placeholder="e.g. Dr. Pratik Gupta or Anita Sharma"
              value={formData.full_name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Username *</label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                autoComplete="new-username"
                name="staff_unique_login"
                placeholder="e.g. dr.pratik or pgupta"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden disabled:bg-slate-100 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Unique login ID. Do not use 'admin' (already taken).</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={e => handleRoleChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-semibold"
              >
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {editingUser ? 'New Password (leave blank to keep unchanged)' : 'Password *'}
            </label>
            <input
              type="password"
              required={!editingUser}
              autoComplete="new-password"
              name="staff_secure_password"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="staff@hospital.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Phone (10 Digits)</label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit number"
                value={formData.mobile_number}
                onChange={e => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile_number: clean });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

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
              {submitting ? 'Saving...' : (editingUser ? 'Save Changes' : 'Create Account')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
