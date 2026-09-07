import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Stethoscope,
  UserRound,
  CalendarDays,
  ListOrdered,
  FileHeart,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  UserPlus,
  Search,
  Clock,
  UserCheck
} from 'lucide-react';

export default function Sidebar({ currentView, setView }) {
  const { user, logout } = useAuth();

  const role = user?.role || 'receptionist';

  // Navigation items based on role
  let navSections = [];

  if (role === 'admin') {
    navSections = [
      {
        title: 'Overview',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
        ]
      },
      {
        title: 'Hospital Management',
        items: [
          { id: 'users', label: 'Users & Staff', icon: Users },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'doctors', label: 'Doctors', icon: Stethoscope },
        ]
      },
      {
        title: 'Clinical Operations',
        items: [
          { id: 'patients', label: 'Patients', icon: UserRound },
          { id: 'appointments', label: 'Appointments', icon: CalendarDays },
          { id: 'queue', label: 'Queue Management', icon: ListOrdered },
          { id: 'consultations', label: 'Consultations', icon: FileHeart },
          { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
        ]
      },
      {
        title: 'Finance & Analytics',
        items: [
          { id: 'billing', label: 'OPD Billing', icon: CreditCard },
          { id: 'payments', label: 'Payments & Receipts', icon: Receipt },
          { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
          { id: 'settings', label: 'System Settings', icon: Settings }
        ]
      }
    ];
  } else if (role === 'receptionist') {
    navSections = [
      {
        title: 'Front Desk',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'patients', label: 'Search / Register Patient', icon: UserPlus },
          { id: 'appointments', label: 'Appointments', icon: CalendarDays },
          { id: 'queue', label: 'Token & Queue', icon: ListOrdered }
        ]
      },
      {
        title: 'Billing & Cashier',
        items: [
          { id: 'billing', label: 'Consultation Bills', icon: CreditCard },
          { id: 'payments', label: 'Payments & Receipts', icon: Receipt },
          { id: 'reports', label: 'Daily OPD Reports', icon: BarChart3 }
        ]
      }
    ];
  } else if (role === 'doctor') {
    navSections = [
      {
        title: 'Doctor Station',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'queue', label: "Today's Patient Queue", icon: ListOrdered },
          { id: 'consultations', label: 'Consultation Workspace', icon: FileHeart },
          { id: 'appointments', label: 'My Appointments', icon: CalendarDays },
          { id: 'patients', label: 'Patient Medical Records', icon: UserRound },
          { id: 'prescriptions', label: 'Prescriptions', icon: FileText }
        ]
      }
    ];
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-61px)] flex flex-col justify-between p-4 no-print shrink-0">
      <div className="space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-hospital-50 text-hospital-800 font-semibold shadow-xs border border-hospital-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-hospital-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Logout */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
