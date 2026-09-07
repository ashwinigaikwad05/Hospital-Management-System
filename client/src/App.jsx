import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Views
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import PatientsView from './views/PatientsView';
import AppointmentsView from './views/AppointmentsView';
import QueueView from './views/QueueView';
import ConsultationView from './views/ConsultationView';
import BillingView from './views/BillingView';
import PaymentsView from './views/PaymentsView';
import ReportsView from './views/ReportsView';
import DepartmentsView from './views/DepartmentsView';
import DoctorsView from './views/DoctorsView';
import UsersView from './views/UsersView';
import SettingsView from './views/SettingsView';

export default function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  // Inter-view communication state
  const [preselectedPatient, setPreselectedPatient] = useState(null);
  const [consultationApptId, setConsultationApptId] = useState(null);
  const [preselectedBill, setPreselectedBill] = useState(null);

  // Reset to dashboard if user role changes
  useEffect(() => {
    setCurrentView('dashboard');
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-hospital-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-hospital-200">
            Initializing OPD Management System...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Handle navigation with payloads
  const handleBookAppointment = (patient) => {
    setPreselectedPatient(patient);
    setCurrentView('appointments');
  };

  const handleStartConsultation = (appointmentId) => {
    setConsultationApptId(appointmentId);
    setCurrentView('consultations');
  };

  const handleCollectPayment = (bill) => {
    setPreselectedBill(bill);
    setCurrentView('payments');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation */}
      <Navbar />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar currentView={currentView} setView={setCurrentView} />

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              setView={setCurrentView}
              onOpenConsultation={handleStartConsultation}
            />
          )}

          {currentView === 'patients' && (
            <PatientsView
              onBookAppointment={handleBookAppointment}
            />
          )}

          {currentView === 'appointments' && (
            <AppointmentsView
              preselectedPatient={preselectedPatient}
              onClearPreselectedPatient={() => setPreselectedPatient(null)}
            />
          )}

          {currentView === 'queue' && (
            <QueueView
              onStartConsultation={handleStartConsultation}
            />
          )}

          {currentView === 'consultations' && (
            <ConsultationView
              initialAppointmentId={consultationApptId}
              onComplete={() => setConsultationApptId(null)}
            />
          )}

          {currentView === 'prescriptions' && (
            <ConsultationView
              initialAppointmentId={consultationApptId}
              onComplete={() => setConsultationApptId(null)}
            />
          )}

          {currentView === 'billing' && (
            <BillingView
              onCollectPayment={handleCollectPayment}
            />
          )}

          {currentView === 'payments' && (
            <PaymentsView
              preselectedBill={preselectedBill}
              onClearPreselectedBill={() => setPreselectedBill(null)}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'departments' && (
            <DepartmentsView />
          )}

          {currentView === 'doctors' && (
            <DoctorsView />
          )}

          {currentView === 'users' && (
            <UsersView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
