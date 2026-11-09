import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, readMerchant } from '../lib/api';

const ACTIVE = 'text-primary font-label-md border-b-2 border-primary pb-1 flex items-center gap-1.5 transition-colors';
const IDLE =
  'text-on-surface-variant font-label-md hover:text-on-surface hover:bg-surface-container-high/40 px-2 py-1 rounded-md transition-all duration-200';

function initials(name) {
  if (!name) return 'SA';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function TopNav({ active }) {
  const navigate = useNavigate();
  const merchant = readMerchant();
  const shortId = merchant.id ? `#MID-${String(merchant.id).slice(0, 6).toUpperCase()}` : '#MID-——';

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 glass-nav shadow-sm backdrop-blur-lg">
      <div className="w-full h-16 max-w-7xl mx-auto px-margin flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            className="text-headline-md font-headline-md font-bold text-on-surface flex items-center gap-space-xs tracking-tight"
            to="/dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-secondary-container to-primary flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="material-symbols-outlined text-white text-xl">bolt</span>
            </div>
            <span>SkarPay Merchant Panel</span>
          </Link>
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-high/60 border border-outline-variant/40">
            <span className="w-2 h-2 rounded-full bg-tertiary pulse-dot" />
            <span className="text-label-sm font-label-sm text-tertiary">Live Production • API v2.4</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link className={active === 'Dashboard' ? ACTIVE : IDLE} to="/dashboard">
            <span>Dashboard</span>
          </Link>
          <Link className={active === 'Payments' ? ACTIVE : IDLE} to="/payments">
            <span>Payments</span>
          </Link>
          <Link className={active === 'Devices' ? ACTIVE : IDLE} to="/devices">
            <span>Devices</span>
          </Link>
          <Link className={active === 'Customizer' ? ACTIVE : IDLE} to="/customizer">
            <span>Customizer</span>
          </Link>
          <span className={IDLE} title="Coming soon">Analytics</span>
          <span className={IDLE} title="Coming soon">API Keys</span>
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 transition-all duration-200"
            title="Notifications"
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-outline-variant/30">
            <div className="w-8 h-8 rounded-full border border-primary/40 bg-gradient-to-tr from-secondary-container to-primary text-white font-semibold text-label-sm flex items-center justify-center">
              {initials(merchant.business_name)}
            </div>
            <div className="hidden xl:flex flex-col">
              <span className="text-label-sm font-label-sm text-on-surface font-semibold leading-tight">
                {merchant.business_name || 'Merchant'}
              </span>
              <span className="text-code-sm font-code-sm text-outline leading-tight">{shortId}</span>
            </div>
          </div>

          <button
            className="ml-2 px-3.5 py-1.5 rounded-lg text-label-md font-label-md text-white bg-surface-variant/80 hover:bg-error-container hover:text-on-error-container border border-outline-variant/50 transition-all duration-200 active:scale-95"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
