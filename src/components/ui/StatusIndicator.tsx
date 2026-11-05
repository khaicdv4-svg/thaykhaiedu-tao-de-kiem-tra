import React from 'react';

export type ServiceStatus = 'READY' | 'CONFIGURED' | 'PENDING_STEP' | 'DISABLED';

interface StatusIndicatorProps {
  label: string;
  sublabel?: string;
  status: ServiceStatus;
  statusText: string;
}

export function StatusIndicator({ label, sublabel, status, statusText }: StatusIndicatorProps) {
  const statusColors: Record<ServiceStatus, { dot: string; bg: string; text: string }> = {
    READY: { dot: 'bg-emerald-500 ring-emerald-200', bg: 'bg-emerald-50/70', text: 'text-emerald-700' },
    CONFIGURED: { dot: 'bg-blue-500 ring-blue-200', bg: 'bg-blue-50/70', text: 'text-blue-700' },
    PENDING_STEP: { dot: 'bg-amber-500 ring-amber-200', bg: 'bg-amber-50/70', text: 'text-amber-700' },
    DISABLED: { dot: 'bg-slate-400 ring-slate-200', bg: 'bg-slate-50', text: 'text-slate-600' },
  };

  const style = statusColors[status];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/70 bg-white hover:border-slate-300 transition-colors">
      <div className="flex items-center space-x-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`} />
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-800">{label}</p>
          {sublabel && <p className="text-[11px] text-slate-500">{sublabel}</p>}
        </div>
      </div>
      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${style.bg} ${style.text}`}>
        {statusText}
      </span>
    </div>
  );
}
