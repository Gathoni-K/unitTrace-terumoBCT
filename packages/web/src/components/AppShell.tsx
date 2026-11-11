import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers';
import { useT } from '../i18n';
import type { Language } from '../types';
import './AppShell.css';

export function AppShell() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>('en');
  const t = useT(language);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">UT</div>
            <div className="sidebar-brand-text">
              <span className="font-headline-sm text-primary">UnitTrace</span>
              <span className="font-label-sm text-secondary uppercase tracking-wider text-[11px]">
                Data Workbench
              </span>
            </div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-section">
            <span className="sidebar-label">Main Operations</span>
            <Link
              to="/"
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </Link>
            <Link
              to="/queue"
              className={`nav-item ${isActive('/queue') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">fact_check</span>
              <span>Records to review</span>
              <span className="nav-badge bg-secondary-container text-on-secondary-fixed">
                24
              </span>
            </Link>
            {role === 'supervisor' && (
              <Link
                to="/approvals"
                className={`nav-item ${isActive('/approvals') ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined">check_circle</span>
                <span>Approvals</span>
                <span className="nav-badge bg-error-container text-on-error-container">
                  6
                </span>
              </Link>
            )}
            <Link
              to="/audit"
              className={`nav-item ${isActive('/audit') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">history</span>
              <span>Activity history</span>
            </Link>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Tools & Diagnostics</span>
            <Link
              to="/methods"
              className={`nav-item ${isActive('/methods') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">bar_chart</span>
              <span>Method results</span>
            </Link>
            <Link
              to="/settings"
              className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </Link>
            <Link
              to="/sms-simulator"
              className={`nav-item ${isActive('/sms-simulator') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">phone_android</span>
              <span>SMS / USSD simulator</span>
            </Link>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="safeguard-box">
            <div className="safeguard-title">
              <span className="material-symbols-outlined text-lg">
                verified_user
              </span>
              <span>Demo Mode</span>
            </div>
            <p className="font-label-sm text-[12px] leading-relaxed text-secondary">
              You are viewing fake test data. Your real hospital data is safe and untouched.
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="main-wrapper">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="status-chip">
              <span className="status-dot"></span>
              <span className="font-label-sm text-on-surface font-medium">
                Online
              </span>
            </div>
            <div className="topbar-sync">
              <span className="material-symbols-outlined text-tertiary">
                cloud_done
              </span>
              <span>Central Bank Synced</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="lang-toggle">
              <button
              type="button"
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
              <button
              type="button"
                className={`lang-btn ${language === 'sw' ? 'active' : ''}`}
                onClick={() => setLanguage('sw')}
              >
                SW
              </button>
            </div>
            <button
            type="button"
            className="icon-btn" aria-label="Toggle theme">
              <span className="material-symbols-outlined">light_mode</span>
            </button>
            <button 
            type="button"
            className="icon-btn" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notification-dot"></span>
            </button>
            <div className="topbar-divider"></div>
            <div className="user-profile">
              <div className="user-avatar">SA</div>
              <div className="user-info">
                <span className="font-label-md text-on-surface leading-none">
                  Sarah Achieng
                </span>
                <span className="user-role">Data Clerk</span>
                <span className="font-label-sm text-[11px] text-secondary mt-0.5">
                  Nairobi Regional Blood Centre
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
