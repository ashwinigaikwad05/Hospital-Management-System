import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import StatCard from '../components/StatCard';
import {
  Users,
  CalendarCheck,
  UserCheck,
  Building2,
  Clock,
  IndianRupee,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  ArrowRight,
  PlusCircle,
  UserPlus
} from 'lucide-react';

export default function DashboardView({ setView, onOpenConsultation }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-hospital-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading live OPD dashboard metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center justify-between">
        <p className="text-sm font-medium">{error}</p>
        <button onClick={fetchDashboard} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const role = user?.role;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-hospital-700 via-hospital-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-hospital-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md mb-3 border border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Hospital OPD Status
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.full_name}
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            {role === 'admin' && 'Real-time overview of hospital departments, doctor workloads, OPD appointments, and daily financial operations.'}
            {role === 'receptionist' && 'Patient registration, appointment scheduling, live token distribution, and cashier billing center.'}
            {role === 'doctor' && `Clinical consultation desk for Dr. ${user?.doctor?.last_name || user?.full_name} (${user?.doctor?.specialization || 'Consultant'}).`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          {role === 'receptionist' && (
            <>
              <button
                onClick={() => setView('patients')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-hospital-800 rounded-xl text-xs font-bold shadow-md hover:bg-hospital-50 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Register Patient
              </button>
              <button
                onClick={() => setView('appointments')}
                className="flex items-center gap-2 px-4 py-2.5 bg-hospital-500 hover:bg-hospital-400 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Book Appointment
              </button>
            </>
          )}
          {role === 'doctor' && (
            <button
              onClick={() => setView('queue')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-hospital-800 rounded-xl text-xs font-bold shadow-md hover:bg-hospital-50 transition-colors"
            >
              <Clock className="w-4 h-4" /> View Live Queue
            </button>
          )}
          {role === 'admin' && (
            <button
              onClick={() => setView('reports')}
              className="flex items-center gap-2 px-4 py-2.5 bg-hospital-500 hover:bg-hospital-400 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <ArrowRight className="w-4 h-4" /> Financial Reports
            </button>
          )}
        </div>
      </div>

      {/* ADMIN DASHBOARD METRICS */}
      {role === 'admin' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value={data?.stats?.totalPatients || 0}
              subtext={`+${data?.stats?.todayPatients || 0} registered today`}
              icon={Users}
              color="hospital"
            />
            <StatCard
              title="Today's Appointments"
              value={data?.stats?.todayAppointments || 0}
              subtext={`${data?.stats?.completedAppointments || 0} completed`}
              icon={CalendarCheck}
              color="blue"
            />
            <StatCard
              title="Patients Waiting"
              value={data?.stats?.patientsWaiting || 0}
              subtext="In active OPD queues"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Today's Revenue"
              value={`₹${Number(data?.stats?.todayRevenue || 0).toLocaleString()}`}
              subtext={`₹${Number(data?.stats?.pendingRevenue || 0).toLocaleString()} pending`}
              icon={IndianRupee}
              color="emerald"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Doctors"
              value={data?.stats?.totalDoctors || 0}
              subtext="Across clinical specialties"
              icon={Stethoscope}
              color="purple"
            />
            <StatCard
              title="Total Departments"
              value={data?.stats?.totalDepartments || 0}
              subtext="Operational clinical units"
              icon={Building2}
              color="blue"
            />
            <StatCard
              title="Completed Consultations"
              value={data?.stats?.completedAppointments || 0}
              subtext="Successfully diagnosed today"
              icon={CheckCircle}
              color="emerald"
            />
            <StatCard
              title="Cancelled Appointments"
              value={data?.stats?.cancelledAppointments || 0}
              subtext="Rescheduled or cancelled"
              icon={AlertCircle}
              color="rose"
            />
          </div>

          {/* Doctor-wise OPD Workload Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Doctor-wise OPD Workload Today</h3>
                <p className="text-xs text-slate-500">Live patient volume, completed consultations, and current waiting queue</p>
              </div>
              <button
                onClick={() => setView('queue')}
                className="text-xs font-semibold text-hospital-700 hover:text-hospital-800 flex items-center gap-1"
              >
                View Full Queue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-bold">Doctor</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold text-center">Total Today</th>
                    <th className="py-3 px-4 font-bold text-center">Completed</th>
                    <th className="py-3 px-4 font-bold text-center">Waiting in Queue</th>
                    <th className="py-3 px-4 font-bold text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.doctorWiseSummary?.map((doc) => {
                    const total = doc.total_appointments || 0;
                    const comp = doc.completed || 0;
                    const percent = total > 0 ? Math.round((comp / total) * 100) : 0;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          Dr. {doc.first_name} {doc.last_name}
                          <p className="font-normal text-slate-500 text-[11px]">{doc.specialization}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{doc.department_name}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800 text-center">{total}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700 text-center">{comp}</td>
                        <td className="py-3 px-4 font-semibold text-amber-700 text-center">{doc.waiting || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-hospital-600 h-2 rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="font-bold text-slate-700 w-8">{percent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* RECEPTIONIST DASHBOARD */}
      {role === 'receptionist' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Registrations"
              value={data?.stats?.todayRegistrations || 0}
              subtext="New patient files created"
              icon={UserPlus}
              color="hospital"
            />
            <StatCard
              title="Today's Appointments"
              value={data?.stats?.todayAppointments || 0}
              subtext="Scheduled OPD visits"
              icon={CalendarCheck}
              color="blue"
            />
            <StatCard
              title="Waiting In Queue"
              value={data?.stats?.waitingPatients || 0}
              subtext="Checked-in & awaiting doctor"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Pending Payments"
              value={`₹${Number(data?.stats?.pendingPayments || 0).toLocaleString()}`}
              subtext="Unpaid consultation bills"
              icon={IndianRupee}
              color="rose"
            />
          </div>

          {/* Quick Doctor Queue Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Today's Doctor Token Queues</h3>
                <p className="text-xs text-slate-500">Live queue counts for each doctor to guide arriving patients</p>
              </div>
              <button
                onClick={() => setView('queue')}
                className="px-3 py-1.5 bg-hospital-50 text-hospital-700 hover:bg-hospital-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                Manage Queue Desk <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.todayQueueSummary?.map((doc) => (
                <div key={doc.doctor_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Dr. {doc.first_name} {doc.last_name}</h4>
                    <p className="text-xs text-hospital-700 font-medium">{doc.department_name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Waiting</p>
                      <p className="text-base font-bold text-amber-600">{doc.waiting || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Consulting</p>
                      <p className="text-base font-bold text-hospital-600">{doc.in_consultation || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Done</p>
                      <p className="text-base font-bold text-emerald-600">{doc.completed || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* DOCTOR DASHBOARD */}
      {role === 'doctor' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Today's Appointments"
              value={data?.stats?.todayAppointments || 0}
              subtext="Scheduled on your calendar"
              icon={CalendarCheck}
              color="blue"
            />
            <StatCard
              title="Waiting in Your Queue"
              value={data?.stats?.waitingPatients || 0}
              subtext="Ready in waiting lounge"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="Completed Today"
              value={data?.stats?.completedConsultations || 0}
              subtext="Consultations finished"
              icon={CheckCircle}
              color="emerald"
            />
          </div>

          {/* Current & Next Patient Banners */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Patient Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-hospital-100 text-hospital-800">
                    Currently In Consultation
                  </span>
                  {data?.currentPatient && (
                    <span className="text-sm font-bold text-hospital-700 bg-hospital-50 px-2 py-0.5 rounded border border-hospital-200">
                      Token #{data.currentPatient.token_number}
                    </span>
                  )}
                </div>

                {data?.currentPatient ? (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-slate-900">
                      {data.currentPatient.first_name} {data.currentPatient.last_name}
                    </h3>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Reg No: <strong className="text-slate-800">{data.currentPatient.patient_registration_number}</strong></p>
                      <p>Age / Gender: <strong className="text-slate-800">{data.currentPatient.age} yrs / {data.currentPatient.gender}</strong></p>
                      <p>Reason: <strong className="text-slate-800">{data.currentPatient.reason_for_visit || 'Routine Consultation'}</strong></p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No patient currently inside the consultation room.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex gap-3">
                {data?.currentPatient ? (
                  <button
                    onClick={() => {
                      if (onOpenConsultation) {
                        onOpenConsultation(data.currentPatient.appointment_id);
                      } else {
                        setView('consultations');
                      }
                    }}
                    className="w-full py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                  >
                    Open Clinical Consultation & Prescribe
                  </button>
                ) : (
                  <button
                    onClick={() => setView('queue')}
                    className="w-full py-2.5 bg-hospital-50 hover:bg-hospital-100 text-hospital-700 font-bold rounded-xl text-xs transition-colors border border-hospital-200"
                  >
                    Call Next Patient from Queue
                  </button>
                )}
              </div>
            </div>

            {/* Next in Line Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                    Next In Line
                  </span>
                  {data?.nextPatient && (
                    <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Token #{data.nextPatient.token_number}
                    </span>
                  )}
                </div>

                {data?.nextPatient ? (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-slate-900">
                      {data.nextPatient.first_name} {data.nextPatient.last_name}
                    </h3>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Reg No: <strong className="text-slate-800">{data.nextPatient.patient_registration_number}</strong></p>
                      <p>Appt No: <strong className="text-slate-800">{data.nextPatient.appointment_number}</strong></p>
                      <p className="text-emerald-700 font-semibold">Status: Checked-In & Waiting</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No waiting patients remaining in queue for today.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={() => setView('queue')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  Manage Full Queue Board <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
