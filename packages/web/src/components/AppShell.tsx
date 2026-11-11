import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useLanguage, ThemeToggle } from '../providers';
import { useT } from '../i18n';
import './AppShell.css';

export function AppShell() {
  const { role } = useAuth();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const t = useT(language);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-layout">
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
            <span className="sidebar-label">
              {t('mainOps') || 'Main Operations'}
            </span>
            <Link
              to="/"
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>{t('summary') || 'Dashboard'}</span>
            </Link>
            <Link
              to="/queue"
              className={`nav-item ${isActive('/queue') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">fact_check</span>
              <span>{t('queue') || 'Records to review'}</span>
            </Link>
            {role === 'supervisor' && (
              <Link
                to="/approvals"
                className={`nav-item ${isActive('/approvals') ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined">check_circle</span>
                <span>{t('approvals') || 'Approvals'}</span>
              </Link>
            )}
            <Link
              to="/audit"
              className={`nav-item ${isActive('/audit') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">history</span>
              <span>{t('audit') || 'Activity history'}</span>
            </Link>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">
              {t('tools') || 'Tools & Diagnostics'}
            </span>
            <Link
              to="/methods"
              className={`nav-item ${isActive('/methods') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">bar_chart</span>
              <span>{t('methods') || 'Method results'}</span>
            </Link>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="safeguard-box">
            <div className="safeguard-title">
              <span className="material-symbols-outlined text-lg">
                verified_user
              </span>
              <span>Safeguards Active</span>
            </div>
            <p className="font-label-sm text-[12px] leading-relaxed text-secondary">
              Demonstration Data · Live safeguards enabled · Never edits
              original records automatically.
            </p>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <div className="status-chip">
              <span className="status-dot"></span>
              <span className="font-label-sm text-on-surface font-medium">
                {t('online') || 'Online'}
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
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
              <button
                className={`lang-btn ${language === 'sw' ? 'active' : ''}`}
                onClick={() => setLanguage('sw')}
              >
                SW
              </button>
            </div>
            <ThemeToggle />
            <button className="icon-btn" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notification-dot"></span>
            </button>
            <div className="topbar-divider"></div>
            <div className="user-profile">
              <div className="user-avatar">
                {role === 'supervisor' ? 'DM' : 'SA'}
              </div>
              <div className="user-info">
                <span className="user-role">
                  {role === 'supervisor' ? 'Supervisor' : 'Data Clerk'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
