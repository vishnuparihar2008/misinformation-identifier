import React, { useState } from 'react';
import { submitCheck } from '../api/index.js';

export default function SubmitBox({ onSubmitted }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await submitCheck(trimmed);
      setText('');
      onSubmitted?.(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        🔍 Paste a message to fact-check
      </label>
      <textarea
        className="w-full rounded-lg border border-gray-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 p-3 text-sm resize-none transition-colors"
        rows={4}
        placeholder="Paste a suspicious forwarded message here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400">{text.length} characters</span>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
              Checking…
            </span>
          ) : (
            'Check Now →'
          )}
        </button>
      </div>
    </form>
  );
}

