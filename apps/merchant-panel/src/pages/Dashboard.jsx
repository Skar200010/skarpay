import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { apiFetch, clearSession, readMerchant } from '../lib/api';
import { formatINR, statusMeta, timeAgo } from '../lib/format';

function deviceIcon(device) {
  const name = `${device.device_name || ''} ${device.device_model || ''}`.toLowerCase();
  if (name.includes('qr')) return 'qr_code_scanner';
  if (name.includes('pos') || name.includes('terminal')) return 'point_of_sale';
  if (name.includes('sound') || name.includes('speaker')) return 'speaker';
  return 'devices';
}

function StatSparkline({ stroke }) {
  return (
    <svg className={`w-16 h-6 ${stroke} fill-none`} viewBox="0 0 60 20">
      <polyline points="0,15 15,10 30,12 45,6 60,4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function KpiCard({ label, icon, iconClass, value, footer }) {
  return (
    <div className="glass-card rounded-xl p-space-lg relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${iconClass}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-metric-display font-metric-display text-on-surface tracking-tight">{value}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-body-sm font-body-sm">{footer}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const merchant = readMerchant();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [dashboard, paymentsRes, devicesRes] = await Promise.allSettled([
          apiFetch('/api/v1/merchant-panel/dashboard'),
          apiFetch('/api/v1/merchant-panel/payments?limit=5'),
          apiFetch('/api/v1/merchant-panel/devices'),
        ]);
        if (cancelled) return;

        if (dashboard.status === 'rejected') {
          if (dashboard.reason?.status === 401) {
            clearSession();
            navigate('/login', { replace: true });
            return;
          }
          setError(dashboard.reason?.message || 'Could not load your dashboard');
        } else {
          setStats(dashboard.value.stats || {});
        }

        if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.payments || []);
        if (devicesRes.status === 'fulfilled') setDevices(devicesRes.value.devices || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load your dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const dash = (value) => (loading ? '—' : value);
  const totalPayments = stats?.total_payments || 0;
  const successful = stats?.successful || 0;
  const successRate = totalPayments > 0 ? Math.round((successful / totalPayments) * 100) : null;
  const isApproved = merchant.status === 'APPROVED';

  const copyOrder = async (orderId) => {
    try {
      await navigator.clipboard.writeText(orderId);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav active="Dashboard" />

      <main className="flex-1 w-full px-margin py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-headline-xl font-headline-xl text-on-surface tracking-tight">
                Welcome, {merchant.business_name || 'Merchant'}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-code-sm font-code-sm border ${
                  isApproved
                    ? 'bg-tertiary/10 border-tertiary/30 text-tertiary'
                    : 'bg-secondary/10 border-secondary/30 text-secondary'
                }`}
              >
                {isApproved ? 'Live' : merchant.status ? merchant.status.toLowerCase() : 'pending'}
              </span>
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1">
              Overview of your payments, terminals, and settlement telemetry for today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-label-md font-label-md text-on-surface bg-surface-container-high/60 hover:bg-surface-container-high border border-outline-variant/40 flex items-center gap-2 transition-all"
              title="Coming soon"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">file_download</span>
              Export Settlement
            </button>
            <button
              className="px-4 py-2 rounded-lg text-label-md font-label-md text-on-surface bg-surface-container-high/60 hover:bg-surface-container-high border border-outline-variant/40 flex items-center gap-2 transition-all"
              title="Coming soon"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">visibility</span>
              Checkout Preview
            </button>
            <button
              className="btn-gradient-primary px-5 py-2 rounded-lg text-label-md font-label-md text-white font-medium flex items-center gap-2 active:scale-95"
              title="Coming soon"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create Payment Link
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-card rounded-xl p-space-lg border-error/40 text-error text-body-md font-body-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <KpiCard
            label="Total Collection"
            icon="account_balance_wallet"
            iconClass="bg-primary-container/20 text-primary border-primary/20"
            value={dash(formatINR(stats?.total_amount))}
            footer={
              <>
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="material-symbols-outlined text-base">trending_up</span>
                  <span className="font-medium">{dash(totalPayments)}</span>
                  <span className="text-outline text-xs">payments all time</span>
                </div>
                <StatSparkline stroke="stroke-tertiary" />
              </>
            }
          />

          <KpiCard
            label="Successful Payments"
            icon="check_circle"
            iconClass="bg-tertiary/15 text-tertiary border-tertiary/30"
            value={dash(successful.toLocaleString('en-IN'))}
            footer={
              <>
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span className="font-medium">{dash(successRate === null ? '—' : `${successRate}%`)}</span>
                  <span className="text-outline text-xs">success rate</span>
                </div>
                <StatSparkline stroke="stroke-tertiary" />
              </>
            }
          />

          <KpiCard
            label="Pending"
            icon="hourglass_top"
            iconClass="bg-surface-bright/50 text-secondary border-outline-variant/50"
            value={
              <>
                {dash(stats?.pending ?? 0)}{' '}
                <span className="text-lg font-normal text-on-surface-variant font-body-md">orders</span>
              </>
            }
            footer={
              <>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-base text-secondary">pending</span>
                  <span className="font-medium text-secondary">in clearance</span>
                </div>
                <span className="text-code-sm font-code-sm text-outline">live</span>
              </>
            }
          />

          <KpiCard
            label="Today"
            icon="today"
            iconClass="bg-secondary-container/30 text-secondary border-secondary/30"
            value={dash(formatINR(stats?.today_amount))}
            footer={
              <>
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="material-symbols-outlined text-base">insights</span>
                  <span className="font-medium">settled today</span>
                </div>
                <StatSparkline stroke="stroke-primary" />
              </>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <div className="lg:col-span-8 space-y-gutter">
            <div className="glass-card rounded-xl p-space-lg border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div>
                  <h2 className="text-headline-md font-headline-md text-on-surface">Real-Time Inflow Telemetry</h2>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    Live gateway velocity recorded across UPI, Cards &amp; NetBanking
                  </p>
                </div>
                <div className="flex items-center bg-surface-container-lowest/80 p-1 rounded-lg border border-outline-variant/30">
                  {['1H', '24H', '7D', '30D'].map((range) => (
                    <button
                      className={`px-2.5 py-1 text-code-sm font-code-sm rounded transition-colors ${
                        range === '24H'
                          ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                      key={range}
                      title="Time series is not wired to the API yet"
                      type="button"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative pt-6 h-64 w-full">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 200">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="lineStroke" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="50%" stopColor="#c0c1ff" />
                      <stop offset="100%" stopColor="#4edea3" />
                    </linearGradient>
                  </defs>
                  <line stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" x1="0" x2="700" y1="40" y2="40" />
                  <line stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" x1="0" x2="700" y1="90" y2="90" />
                  <line stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" x1="0" x2="700" y1="140" y2="140" />
                  <line stroke="rgba(255,255,255,0.08)" x1="0" x2="700" y1="190" y2="190" />
                  <path
                    d="M 0,160 Q 90,140 160,80 T 320,110 T 480,45 T 620,30 L 700,20 L 700,190 L 0,190 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M 0,160 Q 90,140 160,80 T 320,110 T 480,45 T 620,30 L 700,20"
                    fill="none"
                    stroke="url(#lineStroke)"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  <circle className="pulse-dot" cx="480" cy="45" fill="#4edea3" r="5" stroke="#0F131D" strokeWidth="2" />
                  <circle cx="620" cy="30" fill="#c0c1ff" r="4" stroke="#0F131D" strokeWidth="2" />
                </svg>
                <div className="flex justify-between items-center text-code-sm font-code-sm text-outline pt-2">
                  <span>00:00</span>
                  <span>04:00</span>
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                  <span>23:59</span>
                </div>
                <p className="text-body-sm font-body-sm text-outline pt-2">
                  Sample preview — the live series arrives with the analytics endpoint.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/30">
              <div className="p-space-lg flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-low/40">
                <div>
                  <h2 className="text-headline-md font-headline-md text-on-surface">Recent Payments</h2>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    Real-time settlement pipeline and customer gateway requests
                  </p>
                </div>
                <Link className="text-label-sm font-label-sm text-primary hover:text-white flex items-center gap-1 transition-colors" to="/payments">
                  <span>View All Transactions</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container-lowest/50">
                      <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Order ID</th>
                      <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Amount</th>
                      <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Status</th>
                      <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">UTR</th>
                      <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Date</th>
                      <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-body-md font-body-md">
                    {loading && (
                      <tr>
                        <td className="px-space-md py-6 text-body-sm text-outline" colSpan={6}>
                          Loading payments…
                        </td>
                      </tr>
                    )}

                    {!loading && payments.length === 0 && (
                      <tr>
                        <td className="px-space-md py-6 text-body-sm text-outline" colSpan={6}>
                          No payments yet. They will appear here as soon as the first checkout completes.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      payments.map((payment) => {
                        const meta = statusMeta(payment.status);
                        const orderId = payment.order_id || payment.id;
                        return (
                          <tr className="hover:bg-surface-container-high/30 transition-colors group" key={payment.id}>
                            <td className="px-space-md py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-code-sm text-code-sm font-semibold text-primary">{orderId}</span>
                                <button
                                  className="opacity-0 group-hover:opacity-100 text-outline hover:text-on-surface transition-opacity"
                                  onClick={() => copyOrder(String(orderId))}
                                  title="Copy Order ID"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                              </div>
                              <span className="text-body-sm font-body-sm text-on-surface-variant">
                                {payment.currency || 'INR'} • {String(payment.id).slice(0, 8)}
                              </span>
                            </td>
                            <td className="px-space-md py-3.5 font-code-sm text-code-sm text-on-surface font-semibold">
                              {formatINR(payment.amount_paise)}
                            </td>
                            <td className="px-space-md py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-code-sm font-code-sm border ${meta.chip} ${meta.text}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </td>
                            <td
                              className={`px-space-md py-3.5 font-code-sm text-code-sm ${
                                payment.utr ? 'text-on-surface-variant' : 'text-outline italic'
                              }`}
                            >
                              {payment.utr || 'Awaiting Bank ACK'}
                            </td>
                            <td className="px-space-md py-3.5 text-body-sm font-body-sm text-outline">
                              {timeAgo(payment.created_at)}
                            </td>
                            <td className="px-space-md py-3.5 text-right">
                              <button
                                className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                                title="Payment details coming soon"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-base">more_vert</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="p-space-md bg-surface-container-lowest/30 border-t border-outline-variant/20 flex items-center justify-between">
                <span className="text-body-sm font-body-sm text-outline">
                  Showing {loading ? '—' : payments.length} of {loading ? '—' : totalPayments} transactions
                </span>
                <div className="flex gap-2">
                  <Link
                    className="px-3 py-1 rounded bg-surface-container border border-outline-variant/30 text-label-sm font-label-sm text-outline hover:text-on-surface"
                    to="/payments"
                  >
                    View all
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-gutter">
            <div className="glass-card rounded-xl p-space-lg border border-outline-variant/30">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">devices</span>
                  <h2 className="text-headline-md font-headline-md text-on-surface">Paired Devices</h2>
                </div>
                <span className="text-code-sm font-code-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20">
                  {loading ? '—' : `${devices.length} paired`}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {!loading && devices.length === 0 && (
                  <p className="text-body-sm font-body-sm text-on-surface-variant py-2">
                    No devices paired yet. Add a soundbox or terminal to start collecting.
                  </p>
                )}

                {devices.slice(0, 4).map((device) => {
                  const active = device.is_active && device.last_heartbeat_at;
                  return (
                    <div
                      className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/20 flex items-center justify-between hover:border-primary/40 transition-colors"
                      key={device.id}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined">{deviceIcon(device)}</span>
                        </div>
                        <div>
                          <h4 className="text-label-md font-label-md font-semibold text-on-surface">
                            {device.device_name || 'Unnamed device'}
                          </h4>
                          <p className="text-code-sm font-code-sm text-outline">
                            {device.device_model || 'Unknown model'} • {timeAgo(device.last_heartbeat_at || device.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 ${active ? 'text-tertiary' : 'text-outline'}`}>
                        <span className={`w-2 h-2 rounded-full ${active ? 'bg-tertiary' : 'bg-outline'}`} />
                        <span className="text-code-sm font-code-sm">{active ? 'Active' : 'Idle'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link
                className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-outline hover:border-primary text-label-md font-label-md text-on-surface hover:text-primary flex items-center justify-center gap-2 transition-all"
                to="/devices"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Pair New Terminal / Soundbox
              </Link>
            </div>

            <div className="glass-card rounded-xl p-space-lg border border-outline-variant/30">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">palette</span>
                  <h2 className="text-headline-md font-headline-md text-on-surface">Checkout Customizer</h2>
                </div>
                <span className="text-code-sm font-code-sm text-primary">v2.1 live</span>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-3">
                Merchant checkout widget theme styling &amp; custom branding active on your store.
              </p>

              <div className="mt-4 p-4 rounded-xl bg-gradient-to-b from-surface-container-high/90 to-surface-container-lowest border border-primary/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary text-on-primary font-bold text-xs flex items-center justify-center">
                      S
                    </div>
                    <span className="text-label-sm font-label-sm font-semibold text-on-surface">SkarPay Checkout</span>
                  </div>
                  <span className="material-symbols-outlined text-tertiary text-sm">lock</span>
                </div>
                <div className="mt-3 p-2.5 rounded bg-surface-container-lowest/90 border border-outline-variant/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-outline">Order Total</span>
                    <span className="text-on-surface font-semibold font-code-sm">₹1,499.00</span>
                  </div>
                  <div className="mt-2 w-full h-8 rounded bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-on-primary text-label-sm font-semibold">
                    Pay with UPI / Cards
                  </div>
                </div>
              </div>

              <Link
                className="mt-4 w-full py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-label-md font-label-md text-on-surface flex items-center justify-center gap-1.5 transition-colors"
                to="/customizer"
              >
                <span>Configure Theme &amp; Assets</span>
                <span className="material-symbols-outlined text-base">tune</span>
              </Link>
            </div>

            <div className="glass-card rounded-xl p-space-lg border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Next Bank Settlement</span>
                <span className="w-2.5 h-2.5 rounded-full bg-outline" />
              </div>
              <div className="mt-2 text-headline-lg font-headline-lg text-on-surface-variant tracking-tight">—</div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                No settlement account linked yet.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                <div className="text-code-sm font-code-sm">
                  <div className="text-on-surface font-medium">Bank account</div>
                  <div className="text-outline">Add a settlement account to enable payouts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-outline-variant/20 bg-surface-container-lowest/70 backdrop-blur-md py-6">
        <div className="w-full px-margin flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-headline-md font-headline-md font-bold text-on-surface tracking-tight">SkarPay</span>
            <span className="text-outline">|</span>
            <span className="text-body-sm font-body-sm text-outline">
              PCI-DSS Level 1 Certified • 256-Bit Financial Encryption
            </span>
          </div>
          <div className="flex items-center gap-6 text-label-sm font-label-sm text-on-surface-variant">
            <span>Documentation</span>
            <span>Webhook Logs</span>
            <span>System Status: 99.99%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
