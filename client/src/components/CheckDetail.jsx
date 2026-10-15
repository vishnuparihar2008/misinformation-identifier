import React, { useState, useCallback } from 'react';
import VerdictBadge from './VerdictBadge.jsx';
import { approveCheck, dismissCheck, retryCheck } from '../api/index.js';
import { TACTIC_ICONS, STATUS_CONFIG, formatDate } from '../utils.js';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors active:scale-95"
    >
      {copied ? '✅ Copied!' : `📋 Copy ${label}`}
    </button>
  );
}

function ReplyVariant({ variant, check, onAction }) {
  const [loading, setLoading] = useState(false);

  const toneColors = {
    gentle:  'border-green-200 bg-green-50',
    factual: 'border-blue-200 bg-blue-50',
    short:   'border-purple-200 bg-purple-50',
  };
  const toneLabels = { gentle: '🕊️ Gentle', factual: '📋 Factual', short: '⚡ Short' };

  async function handleApprove() {
    setLoading(true);
    try {
      await approveCheck(check._id, variant.tone);
      onAction?.();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Approve failed');
    } finally {
      setLoading(false);
    }
  }

  const canApprove = ['nudged', 'completed'].includes(check.status);

  return (
    <div className={`rounded-xl border p-3 ${toneColors[variant.tone] || 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
          {toneLabels[variant.tone] || variant.tone}
        </span>
        <div className="flex gap-2">
          <CopyButton text={variant.text} label={variant.tone} />
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? 'Posting…' : 'Send to Group'}
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{variant.text}</p>
    </div>
  );
}

export default function CheckDetail({ check: initialCheck, onBack, onRefresh }) {
  const [check, setCheck] = useState(initialCheck);
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  const statusCfg = STATUS_CONFIG[check.status] || {};

  const refresh = useCallback(async () => {
    onRefresh?.();
  }, [onRefresh]);

  async function handleDismiss() {
    setActionLoading('dismiss');
    setActionError('');
    try {
      await dismissCheck(check._id);
      setCheck((c) => ({ ...c, status: 'dismissed' }));
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Dismiss failed');
    } finally {
      setActionLoading('');
    }
  }

  async function handleRetry() {
    setActionLoading('retry');
    setActionError('');
    try {
      await retryCheck(check._id);
      setCheck((c) => ({ ...c, status: 'analyzing' }));
      setTimeout(refresh, 3000);
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Retry failed');
    } finally {
      setActionLoading('');
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4 transition-colors"
      >
        ← Back to checks
      </button>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <VerdictBadge verdict={check.verdict} confidence={check.confidence} />
          <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
          <span className="ml-auto text-xs text-gray-400">{formatDate(check.createdAt)}</span>
        </div>

        {/* Original message */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Original Message</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{check.text || '(no text)'}</p>
        </div>

        {/* Summary */}
        {check.summary && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
            <p className="text-sm text-gray-700 leading-relaxed">{check.summary}</p>
          </div>
        )}

        {/* Uncertainty note */}
        {check.uncertaintyNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">ℹ️ Note: </span>{check.uncertaintyNote}
            </p>
          </div>
        )}
      </div>

      {/* Tactics */}
      {check.tactics && check.tactics.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">🎯 Manipulation Tactics</h3>
          <div className="space-y-2">
            {check.tactics.map((t) => (
              <div key={t.code} className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-lg shrink-0">{TACTIC_ICONS[t.code] || '⚠️'}</span>
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    {t.code.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">{t.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {check.sources && check.sources.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">🔗 Verified Sources</h3>
          <div className="space-y-2">
            {check.sources.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                <span className="text-base shrink-0 mt-0.5">📰</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 leading-snug">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.publisher} · {s.rating}</p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline break-all"
                  >
                    {s.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply Variants */}
      {check.replyVariants && check.replyVariants.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">💬 Family Reply Variants</h3>
          {check.status === 'approved' && check.approvedReply && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              ✅ Reply posted ({check.approvedReply.tone} tone) — {formatDate(check.approvedReply.postedAt)}
            </div>
          )}
          <div className="space-y-3">
            {check.replyVariants.map((v) => (
              <ReplyVariant
                key={v.tone}
                variant={v}
                check={check}
                onAction={refresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      {actionError && (
        <p className="text-red-500 text-xs mb-2">{actionError}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {check.status === 'failed' && (
          <button
            onClick={handleRetry}
            disabled={actionLoading === 'retry'}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'retry' ? 'Retrying…' : '🔄 Retry Analysis'}
          </button>
        )}
        {['nudged', 'completed'].includes(check.status) && (
          <button
            onClick={handleDismiss}
            disabled={actionLoading === 'dismiss'}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'dismiss' ? 'Dismissing…' : '❌ Dismiss'}
          </button>
        )}
      </div>
    </div>
  );
}

