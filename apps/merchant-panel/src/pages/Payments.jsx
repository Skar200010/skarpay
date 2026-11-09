import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import Toast from '../components/Toast';
import { apiFetch, clearSession } from '../lib/api';
import { formatINR, statusMeta, timeAgo } from '../lib/format';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: 'all', label: 'All Time' },
];

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'SUCCESS', label: 'Success' },
  { id: 'ACTIVE,QUEUED,PROCESSING,INITIATED', label: 'Pending' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const METHOD_TABS = ['ALL', 'UPI', 'CARD', 'NETBANKING'];

function methodLabel(method) {
  if (!method) return '—';
  if (method === 'UPI') return 'UPI';
  if (method === 'CARD') return 'CARD';
  if (method === 'NETBANKING') return 'NB';
  return String(method).slice(0, 4).toUpperCase();
}

function methodColor(method) {
  if (method === 'UPI') return 'text-tertiary';
  if (method === 'CARD') return 'text-primary';
  if (method === 'NETBANKING') return 'text-secondary';
  return 'text-outline';
}

function rangeStart(range) {
  if (range === 'all') return null;
  const since = new Date();
  if (range === 'today') since.setHours(0, 0, 0, 0);
  else since.setDate(since.getDate() - 7);
  return since.toISOString();
}

function KpiCard({ label, icon, tone, value, children }) {
  return (
    <div className="glass-panel p-5 rounded-xl transition-all duration-200 hover:border-primary/40 relative overflow-hidden group">
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${tone.glow} rounded-full blur-xl group-hover:scale-125 transition-transform`} />
      <div className="flex items-center justify-between text-outline">
        <span className="text-label-sm font-label-sm tracking-wider uppercase">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${tone.chip} flex items-center justify-center ${tone.text}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
      <div className="mt-3">
        <span className="text-metric-display font-metric-display tracking-tight text-on-surface">{value}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-body-sm font-body-sm flex-wrap">{children}</div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [range, setRange] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const notify = (title, description) => setToast({ title, description });
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [status, method, range, debounced, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
        status,
        method,
      });
      const from = rangeStart(range);
      if (from) params.set('from', from);
      if (debounced.trim()) params.set('q', debounced.trim());

      const data = await apiFetch(`/api/v1/merchant-panel/payments?${params.toString()}`);
      setPayments(data.payments || []);
      setTotal(data.total || 0);
      setError('');
    } catch (err) {
      if (err.status === 401) {
        clearSession();
        window.location.assign('/login');
        return;
      }
      setError(err.message || 'Could not load payments');
    } finally {
      setLoading(false);
    }
  }, [limit, page, status, method, range, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/merchant-panel/payments/summary');
      setSummary(data.summary || null);
    } catch {
      /* KPI cards simply stay blank */
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const firstRow = total === 0 ? 0 : page * limit + 1;
  const lastRow = Math.min(total, (page + 1) * limit);

  const pageNumbers = useMemo(() => {
    const set = new Set([0, pageCount - 1, page - 1, page, page + 1]);
    return [...set].filter((n) => n >= 0 && n < pageCount).sort((a, b) => a - b);
  }, [page, pageCount]);

  const copy = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label} copied`, value);
    } catch {
      notify('Copy failed', 'Your browser blocked clipboard access.');
    }
  };

  const exportCsv = () => {
    if (payments.length === 0) {
      notify('Nothing to export', 'No rows match the current filters.');
      return;
    }
    const header = ['Order ID', 'Amount (INR)', 'Method', 'Status', 'UTR', 'Created At', 'Customer'];
    const rows = payments.map((p) => [
      p.order_id,
      (p.amount_paise || 0) / 100,
      p.method || '',
      p.status,
      p.utr || '',
      p.created_at,
      p.customer?.name || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `skarpay-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Export ready', `${payments.length} rows exported as CSV.`);
  };

  const todayAmount = summary?.today_amount ?? 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 right-10 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute top-[45%] -left-32 w-[450px] h-[450px] bg-secondary-container/15 rounded-full blur-[130px]" />
        <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] bg-tertiary-container/10 rounded-full blur-[150px]" />
      </div>

      <TopNav active="Payments" />

      <main className="relative z-10 flex-1 w-full px-margin py-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">
                Payments &amp; Transactions
              </h1>
              <span className="px-2 py-0.5 rounded text-code-sm font-code-sm bg-primary/10 text-primary border border-primary/20">
                live
              </span>
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1">
              Inspect, filter, and export payment sessions collected by your gateway
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button
              className="px-4 py-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-low/60 hover:bg-surface-container-high/40 text-on-surface text-label-md font-label-md flex items-center gap-2 transition-all duration-150 active:scale-95 shadow-sm"
              onClick={exportCsv}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">file_download</span>
              <span>Export CSV</span>
            </button>
            <button
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-inverse-primary to-primary-container text-white text-label-md font-label-md flex items-center gap-2 glow-primary transition-all duration-150 active:scale-95"
              onClick={load}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Refresh Live Data</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-panel p-4 rounded-xl border-error/40 text-error text-body-md font-body-md">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <KpiCard
            label="Gross Volume (Today)"
            icon="currency_rupee"
            tone={{ glow: 'bg-primary/10', chip: 'bg-primary/10', text: 'text-primary' }}
            value={formatINR(todayAmount)}
          >
            <span className="text-on-surface-variant">
              {summary ? `${summary.today_count} successful of ${summary.today_total} today` : 'loading…'}
            </span>
          </KpiCard>

          <KpiCard
            label="Success Rate"
            icon="verified"
            tone={{ glow: 'bg-tertiary/10', chip: 'bg-tertiary/10', text: 'text-tertiary' }}
            value={summary?.success_rate === null || summary === null ? '—' : `${summary.success_rate}%`}
          >
            <span className="text-on-surface-variant">
              {summary ? `${summary.successful} of ${summary.total_payments} sessions` : 'loading…'}
            </span>
          </KpiCard>

          <KpiCard
            label="Cancelled / Expired"
            icon="event_busy"
            tone={{ glow: 'bg-secondary/10', chip: 'bg-secondary-container/30', text: 'text-secondary' }}
            value={summary ? String(summary.cancelled) : '—'}
          >
            <span className="text-on-surface-variant">
              {summary ? `${formatINR(summary.cancelled_amount)} never collected` : 'loading…'}
            </span>
          </KpiCard>

          <KpiCard
            label="Average Ticket Size"
            icon="shopping_bag"
            tone={{ glow: 'bg-primary/10', chip: 'bg-surface-container-high', text: 'text-primary' }}
            value={summary ? formatINR(summary.avg_ticket) : '—'}
          >
            <span className="text-on-surface-variant">
              {summary ? `across ${summary.successful} successful payments` : 'loading…'}
            </span>
          </KpiCard>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 relative">
              <span className="material-symbols-outlined text-outline absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]">search</span>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40 text-on-surface placeholder:text-outline/70 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Order ID or UTR (e.g. ORD-1793...)"
                type="text"
                value={search}
              />
            </div>

            <div className="md:col-span-4 flex items-center bg-surface-container-lowest/80 border border-outline-variant/40 p-1 rounded-lg">
              {RANGES.map((option) => (
                <button
                  className={`flex-1 py-1.5 text-center text-label-sm font-label-sm rounded transition-colors ${
                    range === option.id
                      ? 'bg-primary/20 text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  key={option.id}
                  onClick={() => setRange(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                className="w-full py-2.5 px-3 rounded-lg border border-outline-variant/40 hover:bg-surface-container-high/40 text-on-surface-variant text-label-sm font-label-sm flex items-center justify-center gap-1.5 transition-colors"
                onClick={() => {
                  setStatus('ALL');
                  setMethod('ALL');
                  setRange('all');
                  setSearch('');
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/20 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider mr-1">Method:</span>
              {METHOD_TABS.map((option) => (
                <button
                  className={`px-3 py-1 rounded-full text-label-sm font-label-sm transition-colors ${
                    method === option
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-outline'
                  }`}
                  key={option}
                  onClick={() => setMethod(option)}
                  type="button"
                >
                  {option === 'ALL' ? 'All' : option.charAt(0) + option.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider mr-1">Status:</span>
              {STATUS_TABS.map((option) => (
                <button
                  className={`px-3 py-1 rounded-full text-label-sm font-label-sm transition-colors border ${
                    status === option.id
                      ? 'bg-surface-container-highest text-on-surface font-semibold border-outline-variant/40'
                      : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-outline'
                  }`}
                  key={option.id}
                  onClick={() => setStatus(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/90 text-outline text-label-sm font-label-sm uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold" scope="col">Order ID &amp; Customer</th>
                  <th className="py-3.5 px-4 font-semibold text-right" scope="col">Amount</th>
                  <th className="py-3.5 px-4 font-semibold" scope="col">UTR / Bank Ref</th>
                  <th className="py-3.5 px-4 font-semibold text-center" scope="col">Status</th>
                  <th className="py-3.5 px-4 font-semibold" scope="col">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-body-md font-body-md">
                {loading && (
                  <tr>
                    <td className="py-6 px-4 text-body-sm text-outline" colSpan={6}>
                      Loading payments…
                    </td>
                  </tr>
                )}

                {!loading && payments.length === 0 && (
                  <tr>
                    <td className="py-6 px-4 text-body-sm text-outline" colSpan={6}>
                      No payments match these filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  payments.map((payment) => {
                    const meta = statusMeta(payment.status);
                    return (
                      <tr className="hover:bg-surface-container-high/30 transition-colors group" key={payment.id}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant/30 flex-shrink-0 group-hover:border-primary/40">
                              <span className={`font-bold text-code-sm ${methodColor(payment.method)}`}>
                                {methodLabel(payment.method)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-code-sm text-code-sm font-semibold text-on-surface">
                                  {payment.order_id || payment.id.slice(0, 8)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container-highest text-outline">
                                  {payment.currency || 'INR'}
                                </span>
                              </div>
                              <div className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                                <span>{payment.customer?.name || 'Guest checkout'}</span>
                                {payment.customer?.mobile_number && (
                                  <>
                                    <span className="text-outline">•</span>
                                    <span className="font-code-sm">{payment.customer.mobile_number}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-code-sm font-semibold ${
                              payment.status === 'SUCCESS' ? 'text-on-surface' : 'text-on-surface-variant'
                            }`}
                          >
                            {formatINR(payment.amount_paise)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {payment.utr ? (
                            <div className="flex items-center gap-1.5 font-code-sm text-body-sm text-on-surface-variant">
                              <span>{payment.utr}</span>
                              <button
                                className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                                onClick={() => copy(payment.utr, 'UTR')}
                                title="Copy UTR"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              </button>
                            </div>
                          ) : (
                            <span className="font-code-sm text-body-sm text-outline italic">
                              {payment.status === 'SUCCESS' ? 'No UTR recorded' : 'Awaiting Bank ACK'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm border ${meta.chip} ${meta.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-on-surface-variant text-body-sm">
                          <div>
                            {payment.created_at
                              ? new Date(payment.created_at).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </div>
                          <div className="text-[11px] text-outline font-code-sm">{timeAgo(payment.created_at)}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
                              onClick={() => copy(payment.order_id || payment.id, 'Order ID')}
                              title="Copy Order ID"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                              onClick={() => copy(payment.id, 'Session ID')}
                              title="Copy session ID"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-outline-variant/30 bg-surface-container-low/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-body-sm font-body-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  className="bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1 text-on-surface text-label-sm font-label-sm focus:border-primary focus:ring-0 outline-none"
                  onChange={(e) => setLimit(Number(e.target.value))}
                  value={limit}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-outline">|</span>
              <span>
                Showing{' '}
                <strong className="text-on-surface font-semibold">
                  {firstRow}-{lastRow}
                </strong>{' '}
                of <strong className="text-on-surface font-semibold">{total}</strong> transactions
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                className="p-2 rounded-lg border border-outline-variant/30 text-outline disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={page === 0}
                onClick={() => setPage(0)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">first_page</span>
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-outline disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-label-sm font-label-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {pageNumbers.map((n, index) => (
                  <React.Fragment key={n}>
                    {index > 0 && n - pageNumbers[index - 1] > 1 && (
                      <span className="px-1 text-outline">...</span>
                    )}
                    <button
                      className={`w-8 h-8 rounded-lg text-label-sm font-label-sm flex items-center justify-center transition-colors ${
                        n === page
                          ? 'bg-primary text-on-primary font-bold'
                          : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                      onClick={() => setPage(n)}
                      type="button"
                    >
                      {n + 1}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <button
                className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-low text-on-surface hover:bg-surface-container hover:border-outline text-label-sm font-label-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                type="button"
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button
                className="p-2 rounded-lg border border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(pageCount - 1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">last_page</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
