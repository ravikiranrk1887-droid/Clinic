export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  if (timeStr.includes('T')) {
    // ISO string
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  // HH:mm format
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatWaitTime = (minutes) => {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes <= 0) return 'Now';
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
};

export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const STATUS_COLORS = {
  waiting: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)', label: 'Waiting' },
  'in-consultation': { bg: 'var(--color-info-light)', color: 'var(--color-info)', label: 'In Consultation' },
  completed: { bg: 'var(--color-success-light)', color: 'var(--color-success)', label: 'Completed' },
  skipped: { bg: 'var(--color-purple-light)', color: 'var(--color-purple)', label: 'Skipped' },
  cancelled: { bg: '#f1f5f9', color: 'var(--color-slate)', label: 'Cancelled' },
  scheduled: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)', label: 'Scheduled' },
  'checked-in': { bg: 'var(--color-teal-light)', color: 'var(--color-teal)', label: 'Checked In' },
  'no-show': { bg: '#f1f5f9', color: 'var(--color-slate)', label: 'No Show' },
};

export const getStatusBadge = (status) => STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#64748b', label: status };

export const getApiErrorMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.errors?.length) return error.response.data.errors.map(e => e.message).join(', ');
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};
