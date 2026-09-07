import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PrescriptionPrint from '../components/PrintTemplates/PrescriptionPrint';
import {
  Stethoscope,
  HeartPulse,
  Pill,
  Plus,
  Trash2,
  Calendar,
  Printer,
  FileCheck,
  CheckCircle2,
  Clock,
  User,
  History,
  AlertCircle
} from 'lucide-react';

export default function ConsultationView({ initialAppointmentId, onComplete }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeAppointments, setActiveAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(initialAppointmentId || '');
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [pastConsultations, setPastConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Print Modal State
  const [printData, setPrintData] = useState(null);

  // Clinical Vitals & Notes Form
  const [formData, setFormData] = useState({
    symptoms: '',
    observations: '',
    diagnosis: '',
    blood_pressure: '120/80 mmHg',
    temperature: '98.4 F',
    weight: '70',
    height: '170',
    advice: '',
    follow_up_date: ''
  });

  // Dynamic Prescription Medicines Table
  const [medicines, setMedicines] = useState([
    {
      medicine_name: 'Paracetamol',
      strength: '650 mg',
      dosage: '1 Tablet',
      frequency: 'Twice Daily',
      duration: '5 Days',
      instructions: 'After meals'
    }
  ]);

  // Quick medicine presets
  const commonMedicines = [
    { name: 'Paracetamol', strength: '650 mg', dosage: '1 Tablet', freq: 'Thrice Daily', dur: '3 Days', inst: 'After meals' },
    { name: 'Amoxicillin + Clavulanate', strength: '625 mg', dosage: '1 Tablet', freq: 'Twice Daily', dur: '5 Days', inst: 'After meals' },
    { name: 'Pantoprazole', strength: '40 mg', dosage: '1 Tablet', freq: 'Once Daily (Morning)', dur: '7 Days', inst: 'Before breakfast' },
    { name: 'Cetirizine', strength: '10 mg', dosage: '1 Tablet', freq: 'Once Daily (Night)', dur: '5 Days', inst: 'At bedtime' },
    { name: 'Telmisartan', strength: '40 mg', dosage: '1 Tablet', freq: 'Once Daily (Morning)', dur: '14 Days', inst: 'After breakfast' },
    { name: 'Metformin', strength: '500 mg', dosage: '1 Tablet', freq: 'Twice Daily', dur: '30 Days', inst: 'With meals' },
    { name: 'Ibuprofen', strength: '400 mg', dosage: '1 Tablet', freq: 'SOS / As needed', dur: '3 Days', inst: 'After food' }
  ];

  // Load appointments awaiting consultation for today
  useEffect(() => {
    async function loadActive() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await api.getAppointments({
          date: today,
          doctor_id: user?.role === 'doctor' ? user.doctor_id : undefined,
          limit: 30
        });
        const appts = res.appointments || [];
        setActiveAppointments(appts);

        // If no preselected appointment, select the first active in consultation or waiting
        if (!selectedAppointmentId && appts.length > 0) {
          const firstConsulting = appts.find(a => a.status === 'In Consultation') || appts.find(a => a.status === 'Waiting') || appts[0];
          setSelectedAppointmentId(firstConsulting.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadActive();
  }, [user]);

  // When selected appointment changes, fetch its details and past patient records
  useEffect(() => {
    if (!selectedAppointmentId) return;

    async function loadAppointmentDetails() {
      setLoading(true);
      try {
        const res = await api.getAppointment(selectedAppointmentId);
        setAppointmentDetails(res.appointment);

        // Pre-fill symptoms if reason for visit was recorded
        if (res.appointment?.reason_for_visit && !formData.symptoms) {
          setFormData(prev => ({
            ...prev,
            symptoms: res.appointment.reason_for_visit
          }));
        }

        // Fetch past consultations for this patient
        if (res.appointment?.patient_id) {
          const pastRes = await api.getPatientConsultations(res.appointment.patient_id);
          setPastConsultations(pastRes.consultations || []);
        }

        // Check if consultation already exists for this appointment
        try {
          const consultRes = await api.getConsultationByAppointment(selectedAppointmentId);
          if (consultRes?.consultation) {
            const c = consultRes.consultation;
            setFormData({
              symptoms: c.symptoms || '',
              observations: c.observations || '',
              diagnosis: c.diagnosis || '',
              blood_pressure: c.blood_pressure || '',
              temperature: c.temperature || '',
              weight: c.weight ? String(c.weight) : '',
              height: c.height ? String(c.height) : '',
              advice: c.advice || '',
              follow_up_date: c.follow_up_date || ''
            });
            if (c.prescription?.medicines?.length > 0) {
              setMedicines(c.prescription.medicines);
            }
          }
        } catch (e) {
          // No consultation yet, fresh form
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAppointmentDetails();
  }, [selectedAppointmentId]);

  // BMI calculation
  const calculateBMI = () => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  };

  // Medicine table handlers
  const handleAddMedicine = () => {
    setMedicines(prev => [
      ...prev,
      { medicine_name: '', strength: '', dosage: '1 Tablet', frequency: 'Twice Daily', duration: '5 Days', instructions: 'After meals' }
    ]);
  };

  const handleAddPreset = (preset) => {
    setMedicines(prev => [
      ...prev,
      {
        medicine_name: preset.name,
        strength: preset.strength,
        dosage: preset.dosage,
        frequency: preset.freq,
        duration: preset.dur,
        instructions: preset.inst
      }
    ]);
  };

  const handleUpdateMedicine = (index, field, value) => {
    setMedicines(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleRemoveMedicine = (index) => {
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Consultation & Prescription
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.diagnosis || !formData.symptoms) {
      showToast('Please provide both Clinical Symptoms and Diagnosis.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Save Consultation
      const consultRes = await api.saveConsultation({
        appointment_id: Number(selectedAppointmentId),
        patient_id: appointmentDetails.patient_id,
        doctor_id: appointmentDetails.doctor_id,
        ...formData,
        consultation_status: 'Completed'
      });

      const consultationId = consultRes.consultation.id;

      // 2. Save Prescription
      const prescRes = await api.savePrescription({
        consultation_id: consultationId,
        patient_id: appointmentDetails.patient_id,
        doctor_id: appointmentDetails.doctor_id,
        diagnosis: formData.diagnosis,
        advice: formData.advice,
        medicines: medicines.filter(m => m.medicine_name.trim())
      });

      showToast('Consultation and Prescription recorded successfully!');

      // 3. Fetch Print Preview
      const printRes = await api.getPrintPrescription(prescRes.prescription.id);
      setPrintData(printRes);

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bmi = calculateBMI();

  return (
    <div className="space-y-6">
      {/* Top Header & Patient Selection Drawer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Clinical Consultation & Prescription Suite
          </h2>
          <p className="text-xs text-slate-500">
            Record patient vital signs, clinical symptoms, diagnosis, and issue digitally certified multi-drug prescriptions
          </p>
        </div>

        {/* Appointment Dropdown */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <Clock className="w-4 h-4 text-hospital-600" />
          <span className="text-slate-500 font-semibold">Active Appointment:</span>
          <select
            value={selectedAppointmentId}
            onChange={e => setSelectedAppointmentId(e.target.value)}
            className="bg-transparent font-bold text-slate-900 focus:outline-hidden"
          >
            {activeAppointments.map(a => (
              <option key={a.id} value={a.id}>
                Token #{a.token_number} - {a.patient_first_name} {a.patient_last_name} ({a.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Banner */}
      {appointmentDetails && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-hospital-100 text-hospital-800 flex items-center justify-center font-bold text-lg shrink-0">
                {appointmentDetails.patient_first_name?.[0]}{appointmentDetails.patient_last_name?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {appointmentDetails.patient_first_name} {appointmentDetails.patient_last_name}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {appointmentDetails.patient_registration_number}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-hospital-50 text-hospital-800 font-bold border border-hospital-200">
                    Token #{appointmentDetails.token_number}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {appointmentDetails.patient_age} Years | {appointmentDetails.patient_gender} | Blood: <strong className="text-rose-600">{appointmentDetails.blood_group || 'Unknown'}</strong> | Mobile: {appointmentDetails.patient_mobile}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <p className="font-bold text-slate-800">Dr. {appointmentDetails.doctor_first_name} {appointmentDetails.doctor_last_name}</p>
                <p className="text-hospital-700">{appointmentDetails.department_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Consultation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vitals Signs Grid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600" /> Patient Vitals Signs
            </h4>
            {bmi && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                parseFloat(bmi) < 18.5 ? 'bg-amber-100 text-amber-800' :
                parseFloat(bmi) <= 24.9 ? 'bg-emerald-100 text-emerald-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                Calculated BMI: {bmi} kg/m²
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Blood Pressure</label>
              <input
                type="text"
                placeholder="e.g. 120/80 mmHg"
                value={formData.blood_pressure}
                onChange={e => setFormData({ ...formData, blood_pressure: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Temperature</label>
              <input
                type="text"
                placeholder="e.g. 98.6 F"
                value={formData.temperature}
                onChange={e => setFormData({ ...formData, temperature: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 70"
                value={formData.weight}
                onChange={e => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 170"
                value={formData.height}
                onChange={e => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Clinical Examination Notes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope className="w-4 h-4 text-hospital-600" /> Clinical Examination & Findings
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chief Complaints / Symptoms *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter patient symptoms and complaints..."
                value={formData.symptoms}
                onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden leading-relaxed"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Clinical Observations & Physical Exam</label>
              <textarea
                rows={3}
                placeholder="Heart sounds, chest clear, tenderness, reflexes..."
                value={formData.observations}
                onChange={e => setFormData({ ...formData, observations: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-900 block mb-1 text-sm">
              Provisional / Final Diagnosis *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acute Bronchitis, Type 2 Diabetes Mellitus, Essential Hypertension..."
              value={formData.diagnosis}
              onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-3.5 py-2.5 border-2 border-hospital-400 bg-hospital-50/20 rounded-xl focus:border-hospital-600 focus:outline-hidden font-semibold text-slate-900 text-sm"
            />
          </div>
        </div>

        {/* Dynamic Prescription Medicines Builder */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-black text-hospital-700 italic">℞</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Digital Prescription Builder</h4>
                <p className="text-slate-500 text-[11px]">Add dosage, frequency, course duration, and food timing instructions</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddMedicine}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-hospital-50 hover:bg-hospital-100 text-hospital-700 font-bold rounded-xl border border-hospital-200 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Another Medicine
            </button>
          </div>

          {/* Quick Presets Ribbon */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-slate-400 mr-1">Quick Presets:</span>
            {commonMedicines.map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddPreset(m)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-hospital-100 text-slate-700 hover:text-hospital-800 font-medium transition-colors"
              >
                + {m.name} ({m.strength})
              </button>
            ))}
          </div>

          {/* Medicines Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Strength</th>
                  <th className="py-2.5 px-3">Dosage</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Instructions</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((med, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paracetamol"
                        value={med.medicine_name}
                        onChange={e => handleUpdateMedicine(index, 'medicine_name', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-hospital-600 focus:outline-hidden font-bold text-slate-900"
                      />
                    </td>
                    <td className="py-2 px-2 w-28">
                      <input
                        type="text"
                        placeholder="e.g. 500 mg"
                        value={med.strength}
                        onChange={e => handleUpdateMedicine(index, 'strength', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-hospital-600 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-2 w-28">
                      <input
                        type="text"
                        placeholder="e.g. 1 Tablet"
                        value={med.dosage}
                        onChange={e => handleUpdateMedicine(index, 'dosage', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-hospital-600 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-2 w-44">
                      <select
                        value={med.frequency}
                        onChange={e => handleUpdateMedicine(index, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-hospital-600 focus:outline-hidden"
                      >
                        <option value="Once Daily (Morning)">Once Daily (Morning)</option>
                        <option value="Once Daily (Night)">Once Daily (Night)</option>
                        <option value="Twice Daily">Twice Daily</option>
                        <option value="Thrice Daily">Thrice Daily</option>
                        <option value="Four Times Daily">Four Times Daily</option>
                        <option value="SOS / As Needed">SOS / As Needed</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 w-28">
                      <input
                        type="text"
                        placeholder="e.g. 5 Days"
                        value={med.duration}
                        onChange={e => handleUpdateMedicine(index, 'duration', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-hospital-600 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="e.g. After food with warm water"
                        value={med.instructions}
                        onChange={e => handleUpdateMedicine(index, 'instructions', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-hospital-600 focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(index)}
                        disabled={medicines.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advice & Follow-up */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Doctor Advice & Dietary Precautions</label>
              <textarea
                rows={3}
                placeholder="e.g. Low sodium diet, maintain fluid intake, avoid lifting heavy weights, repeat ECG..."
                value={formData.advice}
                onChange={e => setFormData({ ...formData, advice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden leading-relaxed"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Follow-up Review Date</label>
              <input
                type="date"
                value={formData.follow_up_date}
                onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
              <div className="flex gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setFormData({ ...formData, follow_up_date: d.toISOString().split('T')[0] });
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-medium"
                >
                  +1 Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 14);
                    setFormData({ ...formData, follow_up_date: d.toISOString().split('T')[0] });
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-medium"
                >
                  +2 Weeks
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-slate-400 text-xs">
              Saving completes the consultation and generates an automatic OPD bill.
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              {submitting ? 'Saving...' : 'Complete Consultation & Generate Prescription'}
            </button>
          </div>
        </div>
      </form>

      {/* PRINTABLE PRESCRIPTION MODAL */}
      {printData && (
        <PrescriptionPrint
          data={printData}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
