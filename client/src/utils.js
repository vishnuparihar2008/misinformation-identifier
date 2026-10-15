// Verdict badge config: label, colors, icon
export const VERDICT_CONFIG = {
  likely_false: {
    label: 'Likely False',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500',
    icon: '❌',
  },
  misleading: {
    label: 'Misleading',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    icon: '⚠️',
  },
  likely_true: {
    label: 'Likely True',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500',
    icon: '✅',
  },
  unverified: {
    label: 'Unverified',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    dot: 'bg-gray-400',
    icon: '❓',
  },
  not_a_claim: {
    label: 'Not a Claim',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
    icon: '💬',
  },
};

export const STATUS_CONFIG = {
  analyzing: { label: 'Analyzing…', color: 'text-indigo-600', pulse: true },
  completed:  { label: 'Completed',  color: 'text-gray-500',   pulse: false },
  nudged:     { label: 'Nudged',     color: 'text-amber-600',  pulse: true  },
  approved:   { label: 'Approved',   color: 'text-green-600',  pulse: false },
  dismissed:  { label: 'Dismissed',  color: 'text-gray-400',   pulse: false },
  ignored:    { label: 'Ignored',    color: 'text-gray-400',   pulse: false },
  failed:     { label: 'Failed',     color: 'text-red-600',    pulse: false },
  received:   { label: 'Received',   color: 'text-gray-400',   pulse: false },
};

export const TACTIC_ICONS = {
  fake_authority:    '🎭',
  fear_appeal:       '😨',
  urgency:           '⏰',
  chain_forward:     '📲',
  miracle_claim:     '✨',
  us_vs_them:        '⚔️',
  missing_source:    '🔍',
  old_content_reused:'📅',
};

export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function truncate(str, n = 100) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

