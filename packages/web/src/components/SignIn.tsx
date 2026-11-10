/* ==========================================================================
   packages/web/src/components/SignIn.tsx
   ========================================================================== */
import React, { useState } from 'react';
import { useAuth } from '../providers';
import { useT } from '../i18n';
import type { Language } from '../types';
import './SignIn.css';

export function SignIn({ onSignIn }: { onSignIn: () => void }) {
  const { setRole } = useAuth();
  const [role, setLocalRole] = useState<'clerk' | 'supervisor'>('clerk');
  const [language, setLanguage] = useState<Language>('en');
  const t = useT(language);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setRole(role);
    onSignIn();
  };

  return (
    <div className="signin-container">
      {/* Top Meta Controls */}
      <div className="signin-meta">
        <div className="signin-status-pill">
          <span className="status-dot"></span>
          KNBTS Central Hub • Online
        </div>
        <div className="signin-controls">
          <div className="lang-switcher">
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
            <button
              className={`lang-btn ${language === 'sw' ? 'active' : ''}`}
              onClick={() => setLanguage('sw')}
            >
              Kiswahili
            </button>
          </div>
          <button className="theme-toggle-btn">
            <span className="material-symbols-outlined">light_mode</span>
          </button>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="signin-card">
        <div className="signin-card-glow-top"></div>
        <div className="signin-card-glow-bottom"></div>

        <div className="signin-ribbon">
          <span className="material-symbols-outlined text-primary">
            verified
          </span>
          KENYA NATIONAL BLOOD TRANSFUSION SERVICE (KNBTS) & PARTNER CENTRES
        </div>

        <div className="signin-brand">
          <div className="signin-logo-box">
            {/* Using a text placeholder since we don't have the image asset yet */}
            <span className="logo-placeholder">UT</span>
          </div>
          <h1 className="font-headline-xl text-on-surface">UnitTrace</h1>
          <p className="font-headline-sm text-primary mt-1">
            Blood-Service Data Quality Workbench
          </p>
          <p className="font-body-md text-on-surface-variant mt-2">
            Secure station login for laboratory reconciliations, donor deferral
            audits, and hemovigilance checks.
          </p>
        </div>

        <form className="signin-form" onSubmit={handleSignIn}>
          {/* Role Selector */}
          <div className="form-group">
            <label className="font-label-md text-on-surface mb-2 block">
              Operational Role
            </label>
            <div className="role-grid">
              <button
                type="button"
                className={`role-card ${role === 'clerk' ? 'active' : ''}`}
                onClick={() => setLocalRole('clerk')}
              >
                <div className="role-header">
                  <span
                    className={
                      role === 'clerk'
                        ? 'text-primary font-bold font-label-md'
                        : 'text-on-surface font-label-md'
                    }
                  >
                    Data Clerk
                  </span>
                  <span
                    className={`material-symbols-outlined ${role === 'clerk' ? 'text-primary' : 'text-outline-variant'}`}
                  >
                    {role === 'clerk'
                      ? 'check_circle'
                      : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="font-label-sm text-on-surface-variant text-left">
                  Review & investigate records
                </span>
              </button>

              <button
                type="button"
                className={`role-card ${role === 'supervisor' ? 'active' : ''}`}
                onClick={() => setLocalRole('supervisor')}
              >
                <div className="role-header">
                  <span
                    className={
                      role === 'supervisor'
                        ? 'text-primary font-bold font-label-md'
                        : 'text-on-surface font-label-md'
                    }
                  >
                    Supervisor
                  </span>
                  <span
                    className={`material-symbols-outlined ${role === 'supervisor' ? 'text-primary' : 'text-outline-variant'}`}
                  >
                    {role === 'supervisor'
                      ? 'check_circle'
                      : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="font-label-sm text-on-surface-variant text-left">
                  Review, approve & monitor quality
                </span>
              </button>
            </div>
          </div>

          {/* Facility Dropdown */}
          <div className="form-group">
            <label className="font-label-md text-on-surface mb-1 block">
              Facility / Centre
            </label>
            <div className="input-wrapper">
              <span className="material-symbols-outlined input-icon">
                local_hospital
              </span>
              <select className="input-field pl-10">
                <option>
                  Nairobi Regional Blood Transfusion Centre (RBTC-NBO)
                </option>
                <option>
                  Kisumu Regional Blood Transfusion Centre (RBTC-KIS)
                </option>
                <option>
                  Mombasa Regional Blood Transfusion Centre (RBTC-MSA)
                </option>
              </select>
              <span className="material-symbols-outlined input-icon-right">
                expand_more
              </span>
            </div>
          </div>

          {/* Email Field */}
          <div className="form-group">
            <div className="flex justify-between items-center mb-1">
              <label className="font-label-md text-on-surface">
                Institutional Email
              </label>
              <span className="font-label-sm text-primary">
                KNBTS Verified Domain
              </span>
            </div>
            <div className="input-wrapper">
              <span className="material-symbols-outlined input-icon">mail</span>
              <input
                type="email"
                className="input-field pl-10"
                defaultValue="sarah.achieng@bloodtransfusion.go.ke"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <div className="flex justify-between items-center mb-1">
              <label className="font-label-md text-on-surface">
                Security Key / Password
              </label>
              <a
                href="#"
                className="font-label-sm text-primary hover:underline"
                onClick={(e) => e.preventDefault()}
              >
                Reset credentials?
              </a>
            </div>
            <div className="input-wrapper">
              <span className="material-symbols-outlined input-icon">lock</span>
              <input
                type="password"
                className="input-field pl-10 pr-10"
                defaultValue="••••••••••••••••"
                required
              />
              <button type="button" className="input-icon-right">
                <span className="material-symbols-outlined">visibility</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn-primary w-full mt-2">
            <span className="material-symbols-outlined">login</span>
            Sign in to UnitTrace
          </button>

          {/* Offline Notice */}
          <div className="notice-box mt-2">
            <span className="material-symbols-outlined text-primary">
              offline_pin
            </span>
            <p className="font-label-sm text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">
                Works offline after first sign-in:
              </strong>{' '}
              Your records, scans, and discrepancy reviews sync automatically
              whenever central connectivity returns.
            </p>
          </div>
        </form>
      </div>

      {/* Footer Notices */}
      <div className="signin-footer">
        <div className="notice-box">
          <span className="material-symbols-outlined text-primary">gavel</span>
          <p className="font-label-sm text-on-surface-variant">
            <strong className="text-on-surface">
              Strict Quality Safeguard:
            </strong>{' '}
            UnitTrace never modifies raw donor registries or laboratory records
            automatically. Every reconciliation and deferral flag requires
            qualified human verification.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-on-surface-variant mt-4">
          <span className="material-symbols-outlined text-sm">info</span>
          <span className="font-label-sm">
            Demonstration System — All donor identifiers and records shown are
            synthetic sample data.
          </span>
        </div>
      </div>
    </div>
  );
}
