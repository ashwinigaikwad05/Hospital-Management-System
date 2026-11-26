import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Activity,
  Lock,
  User,
  Shield,
  Stethoscope,
  UserCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      showToast('Login successful. Welcome to Hospital Management System!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      await login(demoUser, demoPass);
      showToast(`Logged in successfully as ${demoUser}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-hospital-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-hospital-700 to-hospital-900 p-8 text-white text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
            <Activity className="w-9 h-9 text-hospital-200" />
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Hospital Management System</h1>
          <p className="text-xs text-hospital-200 mt-1 font-medium">Hospital Management Portal</p>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Logins Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-hospital-800">
                <Sparkles className="w-4 h-4 text-amber-500" /> 1-Click Demo Login
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Instant Access</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin', 'admin123')}
                className="py-2 px-2.5 bg-white hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl text-slate-800 hover:text-purple-800 font-bold transition-all shadow-2xs flex flex-col items-center gap-1"
              >
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-[11px]">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('receptionist', 'reception123')}
                className="py-2 px-2.5 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-slate-800 hover:text-blue-800 font-bold transition-all shadow-2xs flex flex-col items-center gap-1"
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-[11px]">Receptionist</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('dr.sharma', 'doctor123')}
                className="py-2 px-2.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-slate-800 hover:text-emerald-800 font-bold transition-all shadow-2xs flex flex-col items-center gap-1"
              >
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px]">Doctor</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="admin, receptionist, or dr.sharma"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-hospital-600 focus:outline-hidden font-medium text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Hospital Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-400">
            Enterprise Grade Relational Hospital Management System
          </div>
        </div>
      </div>
    </div>
  );
}
