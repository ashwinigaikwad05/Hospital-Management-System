import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Activity, Shield, UserCheck, Stethoscope, LogOut, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, logout, switchDemoRole } = useAuth();
  const { showToast } = useToast();

  const handleRoleSwitch = async (role) => {
    try {
      await switchDemoRole(role);
      showToast(`Switched role to ${role.toUpperCase()}`, 'info');
    } catch (err) {
      showToast('Failed to switch role: ' + err.message, 'error');
    }
  };

  const roleBadges = {
    admin: { label: 'Admin Panel', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Shield },
    receptionist: { label: 'Receptionist Desk', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: UserCheck },
    doctor: { label: 'Doctor Suite', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Stethoscope },
  };

  const currentBadge = user?.role ? roleBadges[user.role] : null;
  const RoleIcon = currentBadge?.icon || Shield;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md bg-white/95 no-print">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Hospital Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hospital-500 to-hospital-700 flex items-center justify-center text-white shadow-md shadow-hospital-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none flex items-center gap-2">
              Hospital Management System
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-hospital-100 text-hospital-800">
                Hospital System
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Hospital Management System</p>
          </div>
        </div>

        {/* Center: Quick Demo Role Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Switch Demo:
          </span>
          <button
            onClick={() => handleRoleSwitch('admin')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              user?.role === 'admin'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleRoleSwitch('receptionist')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              user?.role === 'receptionist'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Receptionist
          </button>
          <button
            onClick={() => handleRoleSwitch('doctor')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              user?.role === 'doctor'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Doctor (Dr. Sharma)
          </button>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          {currentBadge && (
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentBadge.bg}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{currentBadge.label}</span>
            </div>
          )}

          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800 leading-none">{user?.full_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">@{user?.username}</p>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
