import React from 'react';
import { VERDICT_CONFIG } from '../utils.js';

export default function VerdictBadge({ verdict, confidence }) {
  if (!verdict) return null;
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.unverified;
  const pct = typeof confidence === 'number' ? Math.round(confidence * 100) : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
      {pct !== null && (
        <span className="opacity-70 font-normal">{pct}%</span>
      )}
    </span>
  );
}

