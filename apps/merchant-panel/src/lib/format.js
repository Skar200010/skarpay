// Amounts move through the API in paise.
export function formatINR(paise) {
  const value = Number(paise || 0) / 100;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 45) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_META = {
  SUCCESS: {
    label: 'Success',
    text: 'text-tertiary',
    chip: 'bg-tertiary-container/30 border-tertiary/40',
    dot: 'bg-tertiary',
  },
  PAID: {
    label: 'Paid',
    text: 'text-tertiary',
    chip: 'bg-tertiary-container/30 border-tertiary/40',
    dot: 'bg-tertiary',
  },
  ACTIVE: {
    label: 'Pending',
    text: 'text-secondary',
    chip: 'bg-secondary-container/30 border-secondary/40',
    dot: 'bg-secondary pulse-dot',
  },
  QUEUED: {
    label: 'Queued',
    text: 'text-secondary',
    chip: 'bg-secondary-container/30 border-secondary/40',
    dot: 'bg-secondary pulse-dot',
  },
  PROCESSING: {
    label: 'Processing',
    text: 'text-secondary',
    chip: 'bg-secondary-container/30 border-secondary/40',
    dot: 'bg-secondary pulse-dot',
  },
  INITIATED: {
    label: 'Initiated',
    text: 'text-secondary',
    chip: 'bg-secondary-container/30 border-secondary/40',
    dot: 'bg-secondary pulse-dot',
  },
  CANCELLED: {
    label: 'Cancelled',
    text: 'text-outline',
    chip: 'bg-surface-container-high border-outline-variant/60',
    dot: 'bg-outline',
  },
  FAILED: {
    label: 'Failed',
    text: 'text-error',
    chip: 'bg-error-container/40 border-error/40',
    dot: 'bg-error',
  },
  EXPIRED: {
    label: 'Expired',
    text: 'text-outline',
    chip: 'bg-surface-container-high border-outline-variant/60',
    dot: 'bg-outline',
  },
};

export function statusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || 'Unknown',
      text: 'text-outline',
      chip: 'bg-surface-container-high border-outline-variant/60',
      dot: 'bg-outline',
    }
  );
}
