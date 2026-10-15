import React, { useState, useEffect, useCallback } from 'react';
import CheckCard from '../components/CheckCard.jsx';
import CheckDetail from '../components/CheckDetail.jsx';
import SubmitBox from '../components/SubmitBox.jsx';
import { listChecks, getCheck } from '../api/index.js';
import { useSocket } from '../hooks/useSocket.js';

const VERDICT_FILTERS = [
  { value: '', label: 'All' },
  { value: 'likely_false', label: '❌ Likely False' },
  { value: 'misleading', label: '⚠️ Misleading' },
  { value: 'likely_true', label: '✅ Likely True' },
  { value: 'unverified', label: '❓ Unverified' },
  { value: 'not_a_claim', label: '💬 Not a Claim' },
];

function LiveIndicator({ active }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      Live
    </span>
  );
}

export default function Dashboard() {
  const [checks, setChecks]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [verdictFilter, setVerdict] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [liveFlash, setLiveFlash]   = useState(false);

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await listChecks({ limit: 50, ...(verdictFilter ? { verdict: verdictFilter } : {}) });
      setChecks(data);
    } catch {
      setError('Could not load checks. Make sure the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, [verdictFilter]);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  // Live updates via Socket.IO
  useSocket({
    onCheckCreated: useCallback((payload) => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 1500);
      setChecks((prev) => {
        if (prev.find((c) => c._id === payload.id)) return prev;
        return [{ _id: payload.id, status: payload.status, text: payload.textPreview, createdAt: new Date().toISOString() }, ...prev];
      });
    }, []),

    onCheckUpdated: useCallback((updated) => {
      setChecks((prev) =>
        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
      );
      // Refresh detail view if currently open
      if (selectedId === updated._id) {
        setSelectedCheck(updated);
      }
    }, [selectedId]),

    onCheckFailed: useCallback((payload) => {
      setChecks((prev) =>
        prev.map((c) => (c._id === payload.id ? { ...c, status: 'failed' } : c))
      );
    }, []),
  });

  async function openDetail(checkId) {
    setSelectedId(checkId);
    setDetailLoading(true);
    try {
      const { data } = await getCheck(checkId);
      setSelectedCheck(data);
    } catch {
      setSelectedCheck(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleBack() {
    setSelectedId(null);
    setSelectedCheck(null);
    fetchChecks();
  }

  function handleSubmitted({ checkId }) {
    setTimeout(() => fetchChecks(), 500);
  }

  // Detail view
  if (selectedId) {
    if (detailLoading) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={handleBack} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4">
            ← Back
          </button>
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <CheckDetail
          check={selectedCheck}
          onBack={handleBack}
          onRefresh={() => openDetail(selectedId)}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Submit box */}
      <SubmitBox onSubmitted={handleSubmitted} />

      {/* Checks list header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">Recent Checks</h2>
          <LiveIndicator active={liveFlash} />
        </div>
        <button
          onClick={fetchChecks}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Verdict filters */}
      <div className="flex gap-2 flex-wrap">
        {VERDICT_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setVerdict(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              verdictFilter === f.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-600 text-sm font-medium mb-2">⚠️ {error}</p>
          <button
            onClick={fetchChecks}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && checks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="text-gray-500 text-sm">No checks yet. Paste a message above or add the Telegram bot to a group.</p>
        </div>
      )}

      {!loading && !error && checks.length > 0 && (
        <div className="space-y-3">
          {checks.map((c) => (
            <CheckCard
              key={c._id}
              check={c}
              onClick={() => openDetail(c._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

