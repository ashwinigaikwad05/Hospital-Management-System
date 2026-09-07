import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Clock,
  UserCheck,
  PhoneCall,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  SkipForward,
  Stethoscope,
  Users,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function QueueView({ onStartConsultation }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    user?.role === 'doctor' ? user?.doctor_id : ''
  );
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0]);
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting', 'called', 'skipped', 'completed'

  // Fetch doctors for selector
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await api.getDoctors({ status: 'active' });
        setDoctors(res.doctors || []);
        if (user?.role === 'doctor') {
          setSelectedDoctorId(user.doctor_id);
        } else if (!selectedDoctorId && res.doctors && res.doctors.length > 0) {
          setSelectedDoctorId(res.doctors[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDoctors();
  }, [user]);

  // Fetch queue data
  const fetchQueue = async () => {
    if (!selectedDoctorId) return;
    try {
      setLoading(true);
      const res = await api.getTodayQueue({
        doctor_id: selectedDoctorId,
        date: queueDate
      });
      setQueueData(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      fetchQueue();
    }
  }, [selectedDoctorId, queueDate]);

  // Actions
  const handleCallNext = async () => {
    try {
      const res = await api.callNextPatient(selectedDoctorId);
      showToast(res.message);
      fetchQueue();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStartConsultation = async (item) => {
    try {
      await api.startConsultation(item.id);
      showToast(`Consultation started for Token #${item.token_number}`);
      fetchQueue();
      if (onStartConsultation) {
        onStartConsultation(item.appointment_id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSkip = async (item) => {
    try {
      await api.skipPatient(item.id);
      showToast(`Token #${item.token_number} skipped`);
      fetchQueue();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRequeue = async (item) => {
    try {
      await api.requeuePatient(item.id);
      showToast(`Token #${item.token_number} moved back to waiting queue`);
      fetchQueue();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleComplete = async (item) => {
    try {
      await api.completeQueue(item.id);
      showToast(`Token #${item.token_number} marked as completed`);
      fetchQueue();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const currentDoctor = doctors.find(d => d.id === Number(selectedDoctorId));

  return (
    <div className="space-y-6">
      {/* Top Header & Doctor / Date Selectors */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Real-Time OPD Queue System
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
              Live
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Sequential doctor token management, patient flow orchestration, and consultation desk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Doctor Selector */}
          {user?.role !== 'doctor' ? (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <Stethoscope className="w-4 h-4 text-hospital-600" />
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name} ({d.department_name})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-hospital-50 px-3 py-1.5 rounded-xl border border-hospital-200 text-hospital-800 font-bold">
              <Stethoscope className="w-4 h-4 text-hospital-600" />
              Dr. {user?.doctor?.first_name} {user?.doctor?.last_name} ({user?.doctor?.department_name})
            </div>
          )}

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={queueDate}
              onChange={e => setQueueDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Queue Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Tokens</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{queueData?.stats?.total || 0}</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
          <p className="text-[10px] uppercase font-bold text-amber-700">Waiting</p>
          <p className="text-xl font-bold text-amber-900 mt-0.5">{queueData?.stats?.waitingCount || 0}</p>
        </div>
        <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-center">
          <p className="text-[10px] uppercase font-bold text-sky-700">Called</p>
          <p className="text-xl font-bold text-sky-900 mt-0.5">{queueData?.stats?.calledCount || 0}</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
          <p className="text-[10px] uppercase font-bold text-purple-700">In Room</p>
          <p className="text-xl font-bold text-purple-900 mt-0.5">{queueData?.stats?.inConsultationCount || 0}</p>
        </div>
        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
          <p className="text-[10px] uppercase font-bold text-rose-700">Skipped</p>
          <p className="text-xl font-bold text-rose-900 mt-0.5">{queueData?.stats?.skippedCount || 0}</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
          <p className="text-[10px] uppercase font-bold text-emerald-700">Completed</p>
          <p className="text-xl font-bold text-emerald-900 mt-0.5">{queueData?.stats?.completedCount || 0}</p>
        </div>
      </div>

      {/* Hero Cards: Current In-Consultation & Next In-Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CURRENTLY CONSULTING */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-hospital-500/10 via-white to-white border-2 border-hospital-400 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-hospital-600 text-white shadow-xs">
                <Stethoscope className="w-3.5 h-3.5" /> Inside Consultation Room
              </span>
              {queueData?.current && (
                <span className="text-lg font-mono font-black text-hospital-800 bg-hospital-100 px-3 py-0.5 rounded-lg border border-hospital-200">
                  Token #{queueData.current.token_number}
                </span>
              )}
            </div>

            {queueData?.current ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {queueData.current.patient_first_name} {queueData.current.patient_last_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {queueData.current.patient_registration_number} | Appt #{queueData.current.appointment_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                    <span className="font-semibold text-slate-800">{queueData.current.patient_age} yrs / {queueData.current.patient_gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
                    <span className="font-bold text-rose-700">{queueData.current.blood_group || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Visit Type</span>
                    <span className="font-semibold text-slate-800">{queueData.current.appointment_type}</span>
                  </div>
                </div>

                {queueData.current.reason_for_visit && (
                  <p className="text-xs text-slate-600 bg-hospital-50/50 p-2.5 rounded-lg border border-hospital-100">
                    <strong className="text-slate-800">Reason:</strong> {queueData.current.reason_for_visit}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No patient is currently inside the consultation room.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-hospital-200/80 mt-4 flex gap-3">
            {queueData?.current ? (
              <>
                <button
                  onClick={() => onStartConsultation && onStartConsultation(queueData.current.appointment_id)}
                  className="flex-1 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Stethoscope className="w-4 h-4" /> Open Clinical Workspace
                </button>
                <button
                  onClick={() => handleComplete(queueData.current)}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Done
                </button>
              </>
            ) : queueData?.next ? (
              <button
                onClick={handleCallNext}
                className="w-full py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" /> Call Next Patient (Token #{queueData.next.token_number})
              </button>
            ) : null}
          </div>
        </div>

        {/* NEXT IN LINE BANNER */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                <Clock className="w-3.5 h-3.5" /> Next In Waiting Queue
              </span>
              {queueData?.next && (
                <span className="text-base font-mono font-bold text-amber-800 bg-amber-50 px-3 py-0.5 rounded-lg border border-amber-200">
                  Token #{queueData.next.token_number}
                </span>
              )}
            </div>

            {queueData?.next ? (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">
                  {queueData.next.patient_first_name} {queueData.next.patient_last_name}
                </h3>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Reg No: <strong className="text-slate-800">{queueData.next.patient_registration_number}</strong></p>
                  <p>Age / Gender: <strong className="text-slate-800">{queueData.next.patient_age} yrs / {queueData.next.patient_gender}</strong></p>
                  <p>Scheduled: <strong className="text-slate-800">{queueData.next.appointment_time}</strong></p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No waiting patients currently in line for this doctor.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex gap-3">
            {queueData?.next && (
              <>
                <button
                  onClick={handleCallNext}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" /> Call Patient
                </button>
                <button
                  onClick={() => handleStartConsultation(queueData.next)}
                  className="flex-1 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> Start Consultation
                </button>
                <button
                  onClick={() => handleSkip(queueData.next)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Queue Lists Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`px-5 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'waiting'
                ? 'border-hospital-600 text-hospital-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Waiting Patients</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
              {queueData?.waiting?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('called')}
            className={`px-5 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'called'
                ? 'border-hospital-600 text-hospital-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Called Patients</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-800">
              {queueData?.called?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('skipped')}
            className={`px-5 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'skipped'
                ? 'border-hospital-600 text-hospital-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Skipped</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800">
              {queueData?.skipped?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-5 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'border-hospital-600 text-hospital-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Completed Today</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              {queueData?.completed?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Reg No</th>
                <th className="py-3 px-4">Age/Gender</th>
                <th className="py-3 px-4">Scheduled Time</th>
                <th className="py-3 px-4">Chief Complaint</th>
                <th className="py-3 px-4 text-right">Queue Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading queue...</td>
                </tr>
              ) : queueData?.[activeTab]?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No records found in this queue category.
                  </td>
                </tr>
              ) : (
                queueData?.[activeTab]?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-hospital-800 text-sm bg-hospital-50 px-2 py-0.5 rounded border border-hospital-200">
                        #{item.token_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.patient_first_name} {item.patient_last_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {item.patient_registration_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.patient_age} yrs / {item.patient_gender}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.appointment_time}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {item.reason_for_visit || 'Routine Consultation'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {activeTab === 'waiting' && (
                          <>
                            <button
                              onClick={() => handleStartConsultation(item)}
                              className="px-2.5 py-1 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
                            >
                              Consult
                            </button>
                            <button
                              onClick={() => handleSkip(item)}
                              title="Skip Patient"
                              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                            >
                              <SkipForward className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {activeTab === 'called' && (
                          <>
                            <button
                              onClick={() => handleStartConsultation(item)}
                              className="px-2.5 py-1 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
                            >
                              Start Consult
                            </button>
                            <button
                              onClick={() => handleSkip(item)}
                              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                            >
                              <SkipForward className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {activeTab === 'skipped' && (
                          <button
                            onClick={() => handleRequeue(item)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] border border-amber-200 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Return to Queue
                          </button>
                        )}
                        {activeTab === 'completed' && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
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
    </div>
  );
}
