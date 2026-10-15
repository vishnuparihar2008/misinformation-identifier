import React from 'react';
import { STATUS_CONFIG, formatDate, truncate } from '../utils.js';
import VerdictBadge from './VerdictBadge.jsx';

export default function CheckCard({ check, onClick }) {
  const statusCfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.received;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <VerdictBadge verdict={check.verdict} confidence={check.confidence} />
        <div className="flex items-center gap-1 shrink-0">
          {statusCfg.pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
          )}
          <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
        </div>
      </div>

      {/* Message preview */}
      <p className="text-sm text-gray-700 leading-relaxed mb-2">
        {truncate(check.text || check.gate?.claimText || 'No text', 120)}
      </p>

      {/* Tactics pills */}
      {check.tactics && check.tactics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {check.tactics.slice(0, 3).map((t) => (
            <span
              key={t.code}
              className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"
            >
              {t.code.replace(/_/g, ' ')}
            </span>
          ))}
          {check.tactics.length > 3 && (
            <span className="text-xs text-gray-400">+{check.tactics.length - 3} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
        <span className="uppercase tracking-wide font-medium">{check.platform}</span>
        <span>{formatDate(check.createdAt)}</span>
      </div>
    </button>
  );
}

