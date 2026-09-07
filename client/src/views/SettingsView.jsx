import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import {
  Settings,
  Building2,
  Save,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export default function SettingsView() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await api.getSettings();
        setSettings(res.settings || {});
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      showToast('Hospital configuration and billing settings saved successfully');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-400">Loading hospital settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Hospital Profile</h2>
        <p className="text-xs text-slate-500">
          Hospital metadata printed on patient prescriptions, outpatient invoices, and payment receipts
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs">
        {/* Hospital Branding */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-hospital-600" /> Hospital Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hospital / Clinic Full Name *</label>
              <input
                type="text"
                required
                value={settings.hospital_name || ''}
                onChange={e => handleChange('hospital_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={e => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Clinic / Hospital Address *</label>
            <input
              type="text"
              required
              value={settings.address || ''}
              onChange={e => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={settings.city || ''}
                onChange={e => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={settings.state || ''}
                onChange={e => handleChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pincode</label>
              <input
                type="text"
                value={settings.pincode || ''}
                onChange={e => handleChange('pincode', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Contact & Statutory Info */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-hospital-600" /> Contact & Statutory Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Contact Phone *</label>
              <input
                type="text"
                required
                value={settings.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Email Address *</label>
              <input
                type="email"
                required
                value={settings.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN / Tax ID</label>
              <input
                type="text"
                value={settings.gst_number || ''}
                onChange={e => handleChange('gst_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || '₹'}
                onChange={e => handleChange('currency_symbol', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Website</label>
              <input
                type="text"
                value={settings.website || ''}
                onChange={e => handleChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
