import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'hospital' }) {
  const colorMap = {
    hospital: {
      bg: 'bg-hospital-50',
      text: 'text-hospital-700',
      icon: 'text-hospital-600',
      border: 'border-hospital-100'
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      border: 'border-blue-100'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      border: 'border-amber-100'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      border: 'border-emerald-100'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      icon: 'text-rose-600',
      border: 'border-rose-100'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      icon: 'text-purple-600',
      border: 'border-purple-100'
    }
  };

  const scheme = colorMap[color] || colorMap.hospital;

  return (
    <div className={`p-5 rounded-2xl bg-white border border-slate-150 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {subtext && <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${scheme.bg} ${scheme.icon} shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${scheme.bg}`} />
    </div>
  );
}
