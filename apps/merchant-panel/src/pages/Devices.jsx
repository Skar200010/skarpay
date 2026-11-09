import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import Toast from '../components/Toast';
import { apiFetch, clearSession } from '../lib/api';
import { timeAgo } from '../lib/format';

const ONLINE_WINDOW_MS = 10 * 60 * 1000;

function isOnline(device) {
  if (!device.is_active || !device.last_heartbeat_at) return false;
  return Date.now() - new Date(device.last_heartbeat_at).getTime() < ONLINE_WINDOW_MS;
}

function deviceIcon(device) {
  const name = `${device.device_name || ''} ${device.device_model || ''}`.toLowerCase();
  if (name.includes('qr')) return 'qr_code_scanner';
  if (name.includes('pos') || name.includes('terminal')) return 'point_of_sale';
  if (name.includes('soundbox') || name.includes('sound')) return 'speaker';
  return 'devices';
}

function StatusBadge({ online, revoked }) {
  if (revoked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-surface-container-highest text-outline border border-outline-variant/40 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
        Revoked
      </span>
    );
  }
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-tertiary/15 text-tertiary border border-tertiary/30 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary pulse-dot" />
        Active / Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-secondary-container/30 text-secondary border border-secondary/30 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
      Idle
    </span>
  );
}

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [pairing, setPairing] = useState(null);

  const notify = (title, description) => setToast({ title, description });
  const closeToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/v1/merchant-panel/devices');
      setDevices(data.devices || []);
      setError('');
    } catch (err) {
      if (err.status === 401) {
        clearSession();
        window.location.assign('/login');
        return;
      }
      setError(err.message || 'Could not load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const online = devices.filter(isOnline).length;
    const latest = devices.reduce((acc, d) => {
      if (!d.last_heartbeat_at) return acc;
      const ts = new Date(d.last_heartbeat_at).getTime();
      return ts > acc ? ts : acc;
    }, 0);
    return {
      total: devices.length,
      online,
      idle: devices.length - online,
      lastHeartbeat: latest ? new Date(latest).toISOString() : null,
    };
  }, [devices]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((device) => {
      const online = isOnline(device);
      if (filter === 'online' && !online) return false;
      if (filter === 'idle' && online) return false;
      if (!q) return true;
      return [device.device_name, device.device_model, device.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [devices, filter, query]);

  const revoke = async (device) => {
    const confirmed = window.confirm(
      `Revoke ${device.device_name || 'this device'}? It will stop reporting payments until it is paired again.`,
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/v1/merchant-panel/devices/${device.id}`, { method: 'DELETE' });
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      notify('Device revoked', `${device.device_name || 'Device'} can no longer report payments.`);
    } catch (err) {
      notify('Could not revoke device', err.message);
    }
  };

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label} copied`, value);
    } catch {
      notify('Copy failed', 'Your browser blocked clipboard access.');
    }
  };

  const openPairing = async () => {
    setPairing({ loading: true });
    try {
      const data = await apiFetch('/api/v1/merchant-panel/enrollment-token');
      setPairing({ token: data.token, expiresAt: data.expiresAt });
    } catch (err) {
      setPairing({ error: err.message || 'Could not create a pairing token' });
    }
  };

  const scrollToRegistry = () => {
    document.getElementById('device-registry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    notify('Diagnostics opened', 'Device registry and heartbeat data are shown below.');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <div className="fixed top-0 right-1/4 w-[600px] h-[500px] bg-primary-container/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-10 w-[550px] h-[450px] bg-tertiary-container/10 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-1/3 w-[300px] h-[300px] bg-secondary-container/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <TopNav active="Devices" />

      <main className="flex-1 w-full px-margin py-space-lg space-y-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-2">
          <div>
            <div className="flex items-center gap-space-xs text-primary font-code-sm text-code-sm mb-1 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">sensors</span>
              Hardware Fleet Management
            </div>
            <h1 className="text-headline-xl font-headline-xl text-on-surface tracking-tight">
              Paired Devices &amp; Hardware
            </h1>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1 max-w-2xl">
              Android observers paired to your merchant account, with pairing status and heartbeat telemetry
              straight from the gateway.
            </p>
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <button
              className="px-4 py-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-2 transition-all active:scale-95 shadow-sm hover:border-primary/50"
              onClick={scrollToRegistry}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">troubleshoot</span>
              Run Diagnostic
            </button>
            <button
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary text-white font-label-md text-label-md font-medium flex items-center gap-2 hover:opacity-95 transition-all glow-primary active:scale-95"
              onClick={openPairing}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              + Pair New Hardware
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-panel p-space-md rounded-xl border-error/40 text-error text-body-md font-body-md">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="glass-panel p-space-md rounded-xl hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Total Terminals</span>
              <span className="p-1.5 rounded-lg bg-tertiary-container/30 text-tertiary">
                <span className="material-symbols-outlined text-[18px]">router</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-metric-display font-metric-display text-on-surface tracking-tight">
                {loading ? '—' : stats.online}{' '}
                <span className="text-headline-md font-headline-md text-outline">/ {loading ? '—' : stats.total}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-tertiary/15 text-tertiary border border-tertiary/30 glow-tertiary">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                Online
              </span>
            </div>
            <div className="mt-2 text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
              {loading ? 'Checking fleet…' : `${stats.total} device${stats.total === 1 ? '' : 's'} paired`}
            </div>
          </div>

          <div className="glass-panel p-space-md rounded-xl hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Idle Terminals</span>
              <span className="p-1.5 rounded-lg bg-surface-container-high text-secondary">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-metric-display font-metric-display text-on-surface tracking-tight">
                {loading ? '—' : stats.idle}
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant font-code-sm">no heartbeat</span>
            </div>
            <div className="mt-2 text-body-sm font-body-sm text-on-surface-variant flex items-center justify-between">
              <span>Quiet for 10+ minutes</span>
              <span className="text-on-surface font-code-sm">{loading ? '—' : `of ${stats.total}`}</span>
            </div>
          </div>

          <div className="glass-panel p-space-md rounded-xl hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Last Heartbeat</span>
              <span className="p-1.5 rounded-lg bg-surface-container-high text-primary">
                <span className="material-symbols-outlined text-[18px]">monitor_heart</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-headline-lg font-headline-lg text-on-surface">
                {loading ? '—' : timeAgo(stats.lastHeartbeat)}
              </span>
            </div>
            <div className="mt-2 text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-tertiary">bolt</span>
              Pinged by the observer app
            </div>
          </div>

          <div className="glass-panel p-space-md rounded-xl hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Pairing Mode</span>
              <span className="p-1.5 rounded-lg bg-surface-container-high text-tertiary">
                <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-headline-lg font-headline-lg text-on-surface">Token</span>
              <span className="font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container-highest text-primary">
                10 min TTL
              </span>
            </div>
            <div className="mt-2 text-body-sm font-body-sm text-on-surface-variant flex items-center justify-between">
              <span>Signed, merchant scoped</span>
              <button className="text-primary hover:underline font-medium" onClick={openPairing} type="button">
                Generate
              </button>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-outline-variant/30 pb-space-sm">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Devices' },
              { id: 'online', label: 'Online' },
              { id: 'idle', label: 'Idle' },
            ].map((tab) => (
              <button
                className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-colors shrink-0 ${
                  filter === tab.id
                    ? 'bg-surface-container-high text-on-surface border border-primary/40 font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                }`}
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
              <input
                className="w-full pl-9 pr-3 py-1.5 text-body-sm font-body-sm bg-surface-container-lowest/80 border border-outline-variant/50 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name or ID..."
                type="text"
                value={query}
              />
            </div>
            <button
              className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
              onClick={load}
              title="Refresh devices"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {loading && (
            <div className="glass-panel p-space-lg rounded-xl text-body-md text-on-surface-variant">
              Loading devices…
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="glass-panel p-space-lg rounded-xl border-outline-variant/30 lg:col-span-2 text-center py-space-xl">
              <span className="material-symbols-outlined text-[40px] text-outline">devices_other</span>
              <h3 className="text-headline-md font-headline-md text-on-surface mt-2">
                {devices.length === 0 ? 'No hardware paired yet' : 'No devices match this filter'}
              </h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                {devices.length === 0
                  ? 'Generate a pairing token and connect the observer app to start collecting payments.'
                  : 'Try a different filter or clear the search box.'}
              </p>
              {devices.length === 0 && (
                <button
                  className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary text-white font-label-md text-label-md glow-primary"
                  onClick={openPairing}
                  type="button"
                >
                  + Pair New Hardware
                </button>
              )}
            </div>
          )}

          {!loading &&
            visible.map((device) => {
              const online = isOnline(device);
              return (
                <div
                  className="glass-panel p-space-lg rounded-xl border border-outline-variant/30 hover:border-primary/50 transition-all flex flex-col justify-between relative group"
                  key={device.id}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
                  <div>
                    <div className="flex items-start justify-between gap-space-md">
                      <div className="flex items-center gap-space-md">
                        <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[28px]">{deviceIcon(device)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-headline-md font-headline-md text-on-surface">
                              {device.device_name || 'Unnamed device'}
                            </h3>
                            <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-primary-fixed-dim">
                              {device.device_model || 'Unknown model'}
                            </span>
                          </div>
                          <p className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px] text-outline">fingerprint</span>
                            {String(device.id).slice(0, 8)}… • paired {timeAgo(device.created_at)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge online={online} />
                    </div>

                    <div className="grid grid-cols-3 gap-space-sm my-space-md p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/20">
                      <div className="flex flex-col">
                        <span className="text-label-sm font-label-sm text-outline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-tertiary">monitor_heart</span>
                          Heartbeat
                        </span>
                        <span className="font-code-sm text-body-md text-on-surface mt-0.5 font-semibold">
                          {timeAgo(device.last_heartbeat_at)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-label-sm font-label-sm text-outline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                          Signing
                        </span>
                        <span className="font-code-sm text-body-md text-on-surface mt-0.5 font-semibold">
                          {device.is_active ? 'Active key' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-label-sm font-label-sm text-outline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-secondary">history</span>
                          Paired
                        </span>
                        <span className="font-code-sm text-body-sm text-on-surface mt-0.5 truncate">
                          {device.created_at ? new Date(device.created_at).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm pt-space-sm border-t border-outline-variant/20">
                    <button
                      className="flex-1 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-label-md text-label-md flex items-center justify-center gap-1.5 border border-primary/30 transition-all active:scale-95"
                      onClick={() => copy(device.id, 'Device ID')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      Copy Device ID
                    </button>
                    <button
                      className="py-2 px-4 rounded-lg bg-surface-container-high hover:bg-error-container/40 text-on-surface hover:text-on-error-container font-label-md text-label-md border border-outline-variant/40 flex items-center gap-1.5 transition-all active:scale-95"
                      onClick={() => revoke(device)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">link_off</span>
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <section className="glass-panel-elevated p-space-lg rounded-xl border border-outline-variant/40" id="device-registry">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-md border-b border-outline-variant/20 gap-space-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stats.online > 0 ? 'bg-tertiary pulse-dot' : 'bg-outline'}`} />
                <h2 className="text-headline-md font-headline-md text-on-surface">Device Registry &amp; Diagnostics</h2>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
                Every observer paired to this merchant account, with its signing state and last heartbeat.
              </p>
            </div>
            <button
              className="px-3 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-sm font-label-sm border border-outline-variant/40 flex items-center gap-1 self-start md:self-auto"
              onClick={load}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Scan Now
            </button>
          </div>

          <div className="overflow-x-auto mt-space-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-lowest/50">
                  <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Device</th>
                  <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Model</th>
                  <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Device ID</th>
                  <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline">Last Heartbeat</th>
                  <th className="px-space-md py-3 text-label-sm font-label-sm uppercase tracking-wider text-outline text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-md font-body-md">
                {devices.length === 0 && (
                  <tr>
                    <td className="px-space-md py-4 text-body-sm text-outline" colSpan={5}>
                      No devices registered yet.
                    </td>
                  </tr>
                )}
                {devices.map((device) => (
                  <tr className="hover:bg-surface-container-high/30 transition-colors" key={`row-${device.id}`}>
                    <td className="px-space-md py-3 font-medium text-on-surface">{device.device_name || 'Unnamed device'}</td>
                    <td className="px-space-md py-3 text-on-surface-variant">{device.device_model || '—'}</td>
                    <td className="px-space-md py-3 font-code-sm text-code-sm text-outline">{String(device.id).slice(0, 8)}…</td>
                    <td className="px-space-md py-3 text-body-sm text-outline">{timeAgo(device.last_heartbeat_at)}</td>
                    <td className="px-space-md py-3 text-right">
                      <span className={isOnline(device) ? 'text-tertiary' : 'text-on-surface-variant'}>
                        {isOnline(device) ? 'Online' : 'Idle'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {pairing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-margin">
          <div className="glass-panel-elevated rounded-xl p-space-lg w-full max-w-lg border border-primary/30">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-headline-md font-headline-md text-on-surface">Pair new hardware</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                  Paste this one-time token into the SkarPay Observer app on the device.
                </p>
              </div>
              <button className="text-outline hover:text-on-surface" onClick={() => setPairing(null)} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {pairing.loading && <p className="text-body-sm text-on-surface-variant mt-6">Generating token…</p>}

            {pairing.error && <p className="text-body-sm text-error mt-6">{pairing.error}</p>}

            {pairing.token && (
              <>
                <div className="mt-5 p-3 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40 font-code-sm text-code-sm text-primary break-all">
                  {pairing.token}
                </div>
                <div className="mt-3 flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                  <span>
                    Expires {pairing.expiresAt ? new Date(pairing.expiresAt).toLocaleTimeString('en-IN') : 'in 10 minutes'}
                  </span>
                  <button
                    className="text-primary hover:underline font-medium"
                    onClick={() => copy(pairing.token, 'Pairing token')}
                    type="button"
                  >
                    Copy token
                  </button>
                </div>
                <ol className="mt-4 space-y-1 text-body-sm font-body-sm text-on-surface-variant list-decimal list-inside">
                  <li>Open the SkarPay Observer app on the Android device.</li>
                  <li>Choose “Pair with token” and paste the code above.</li>
                  <li>The device will appear in this list within a few seconds.</li>
                </ol>
              </>
            )}

            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md border border-outline-variant/40"
                onClick={() => setPairing(null)}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
