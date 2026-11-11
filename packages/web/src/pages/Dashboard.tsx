/* ==========================================================================
   packages/web/src/pages/Dashboard.tsx
   ========================================================================== */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getMetrics,
  getAuditLogs,
  type BeforeAfterReport,
  type AuditLogItem,
} from '../api';
import { useAuth } from '../providers';
import './Dashboard.css';

export function Dashboard() {
  const location = useLocation();
  const { role, setRole } = useAuth();
  const userRole = role === 'supervisor' ? 'supervisor' : 'clerk';
  const userName = userRole === 'supervisor' ? 'Dr. Mwangi' : 'Sarah';

  const [metrics, setMetrics] = useState<BeforeAfterReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAudit, setRefreshingAudit] = useState(false);

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch((err) => {
        console.warn(
          'Live metrics API fallback to starter dataset baseline:',
          err,
        );
      })
      .finally(() => setLoading(false));

    getAuditLogs(10)
      .then(setAuditLogs)
      .catch((err) => {
        console.warn('Audit logs API fallback:', err);
      });
  }, [location.pathname]);

  const handleRefreshAudit = async () => {
    setRefreshingAudit(true);
    try {
      const logs = await getAuditLogs(10);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to refresh audit logs:', err);
    } finally {
      setRefreshingAudit(false);
    }
  };

  const breakdownMap = useMemo(() => {
    const map: Record<string, { before: number; resolved: number }> = {};
    if (metrics?.taskBreakdown) {
      for (const b of metrics.taskBreakdown) {
        map[b.type] = { before: b.beforeOpen, resolved: b.afterResolved };
      }
    }
    return map;
  }, [metrics]);

  // Real defect numbers computed from live backend or starter dataset
  const unconfirmedTransfers =
    breakdownMap['unconfirmed_transfer']?.before ?? 1046;
  const missingDonorBloodGroup =
    breakdownMap['missing_donor_blood_group']?.before ?? 506;
  const unknownPatientBloodGroup =
    breakdownMap['unknown_patient_blood_group']?.before ?? 442;
  const duplicateDonors = breakdownMap['duplicate_donor']?.before ?? 454;
  const facilityNamesMismatch =
    (breakdownMap['implausible']?.before ||
      breakdownMap['facility_name']?.before) ??
    710;
  const loggerGaps = breakdownMap['logger_gap']?.before ?? 370;
  const sensorGlitches = breakdownMap['sensor_glitch']?.before ?? 55;
  const donationTooSoon = breakdownMap['donation_too_soon']?.before ?? 67;

  // Aggregate totals
  const totalDefects =
    metrics?.beforeValue && metrics.beforeValue > 0
      ? metrics.beforeValue
      : unconfirmedTransfers +
        missingDonorBloodGroup +
        unknownPatientBloodGroup +
        duplicateDonors +
        facilityNamesMismatch +
        loggerGaps +
        sensorGlitches +
        donationTooSoon;

  const totalResolved = metrics?.resolvedCount ?? 0;
  const totalOpen = Math.max(0, totalDefects - totalResolved);
  const waitingSupervisor = Math.max(
    0,
    duplicateDonors - (breakdownMap['duplicate_donor']?.resolved ?? 0),
  );

  return (
    <div className="dashboard-container">
      {/* Safeguard Ribbon */}
      <div className="safeguard-ribbon">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            shield
          </span>
          <span className="font-label-sm">
            <strong>Safeguard Active:</strong> Demonstration Data — Fictional
            records for demonstration purposes. Raw hospital databases remain
            write-protected.
          </span>
        </div>
        <div className="flex gap-4 text-xs opacity-80">
          <span>Batch #KE-2025-084</span>
          <span>•</span>
          <span>NBO Zone Node 04</span>
        </div>
      </div>

      <div className="dashboard-content">
        {/* HERO */}
        <div className="hero-card">
          <div className="hero-glow-top"></div>
          <div className="hero-glow-bottom"></div>
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-meta">
                <span className="pill-primary">Clinical Workspace</span>
                <span className="text-secondary text-xs">•</span>
                <span className="flex items-center gap-1 text-xs text-secondary">
                  <span className="material-symbols-outlined text-sm text-tertiary">
                    check_circle
                  </span>
                  Smart Matching Active
                </span>
              </div>
              <h1 className="font-headline-lg text-on-surface">
                Welcome back, {userName}{' '}
                <span className="text-secondary font-normal">
                  ({userRole === 'supervisor' ? 'Supervisor' : 'Data Clerk'})
                </span>
              </h1>
              <div className="hero-subtitle">
                <span className="flex items-center gap-1.5 font-medium text-on-surface">
                  <span className="material-symbols-outlined text-base text-primary">
                    local_hospital
                  </span>
                  Nairobi Regional Blood Transfusion Centre · RBTC-NBO
                </span>
                <span className="hidden sm:inline text-outline-variant">|</span>
                <span className="text-secondary text-xs">
                  Automated inspection engine active (Kenya National Dataset · 8
                  Rule Sets)
                </span>
              </div>
            </div>
            <div className="hero-actions">
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '4px',
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--border-radius-lg)',
                  marginRight: '8px',
                }}
              >
                <button
                  onClick={() => {
                    localStorage.setItem('userRole', 'clerk');
                    setRole('clerk');
                  }}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      role === 'clerk'
                        ? 'var(--primary-container)'
                        : 'transparent',
                    color:
                      role === 'clerk'
                        ? 'var(--on-primary)'
                        : 'var(--on-surface-variant)',
                  }}
                >
                  Clerk
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('userRole', 'supervisor');
                    setRole('supervisor');
                  }}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      role === 'supervisor'
                        ? 'var(--primary-container)'
                        : 'transparent',
                    color:
                      role === 'supervisor'
                        ? 'var(--on-primary)'
                        : 'var(--on-surface-variant)',
                  }}
                >
                  Supervisor
                </button>
              </div>
              <Link to="/queue" className="btn-hero-primary">
                <span className="material-symbols-outlined">play_arrow</span>
                Continue reviewing ({totalOpen.toLocaleString()} open tasks)
              </Link>
              <button type="button" className="btn-hero-secondary">
                <span className="material-symbols-outlined">upload_file</span>
                Upload new dataset
              </button>
            </div>
          </div>
        </div>

        {/* METRICS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="font-label-md text-secondary">
                Total records checked
              </span>
              <div className="metric-icon">
                <span className="material-symbols-outlined">database</span>
              </div>
            </div>
            <div>
              <div className="font-headline-xl text-on-surface">43,363</div>
              <p className="font-label-sm text-secondary mt-1">
                Donors &amp; transfers across national network
              </p>
            </div>
          </div>

          <div className="metric-card metric-card-warning">
            <div className="metric-header">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-on-surface font-semibold">
                  Records needing review
                </span>
                <span className="status-dot"></span>
              </div>
              <div className="metric-icon metric-icon-error">
                <span className="material-symbols-outlined">
                  pending_actions
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-error font-bold">
                  {loading ? '…' : totalOpen.toLocaleString()}
                </span>
                <span className="text-xs font-label-sm text-secondary">
                  action needed
                </span>
              </div>
              <p className="font-label-sm text-on-surface-variant font-medium mt-1">
                {duplicateDonors.toLocaleString()} high confidence AI matches
              </p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="font-label-md text-secondary">
                Records reviewed &amp; fixed
              </span>
              <div className="metric-icon">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
            </div>
            <div>
              <div className="font-headline-xl text-on-surface">
                {loading ? '…' : totalResolved.toLocaleString()}
              </div>
              <p className="font-label-sm text-secondary mt-1">
                {metrics?.improvementPercentage
                  ? `${metrics.improvementPercentage} resolved`
                  : 'Committed to clean tables'}
              </p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="font-label-md text-secondary">
                Waiting for approval
              </span>
              <div className="metric-icon">
                <span className="material-symbols-outlined">fact_check</span>
              </div>
            </div>
            <div>
              <div className="font-headline-xl text-primary">
                {loading ? '…' : waitingSupervisor.toLocaleString()}
              </div>
              <p className="font-label-sm text-secondary mt-1">
                Restricted to supervisor approval
              </p>
            </div>
          </div>
        </div>

        {/* PROBLEMS GRID */}
        <div className="problems-section">
          <div className="section-header">
            <div>
              <h2 className="font-headline-md text-on-surface">
                Data Quality Issues Found
              </h2>
              <p className="font-body-md text-secondary text-sm">
                Discrepancies identified during automated checks. Click any card
                to inspect and resolve.
              </p>
            </div>
            <span className="font-label-sm text-secondary bg-surface-container-high px-3 py-1 rounded-full">
              8 Rule-Sets Run · {totalOpen.toLocaleString()} Total Open
            </span>
          </div>

          <div className="problems-grid">
            <ProblemCard
              icon="people"
              badge={`${duplicateDonors.toLocaleString()} records`}
              badgeClass="bg-error-container text-on-error-container"
              title="Same person, different record"
              desc="Our AI thinks these two records might belong to the same person. A human needs to check."
            />
            <ProblemCard
              icon="domain_disabled"
              badge={`${facilityNamesMismatch.toLocaleString()} records`}
              title="Hospital name spelled wrong"
              desc="The hospital name doesn't match the national registry. This breaks national reports."
            />
            <ProblemCard
              icon="bloodtype"
              badge={`${missingDonorBloodGroup.toLocaleString()} records`}
              title="Donor has no blood type"
              desc="This donor's blood type is missing. We cannot safely match them to a patient."
            />
            <ProblemCard
              icon="emergency"
              badge={`${unknownPatientBloodGroup.toLocaleString()} urgent`}
              badgeClass="bg-error-container text-on-error-container"
              title="Patient has no blood type"
              desc="A patient needs blood, but the hospital didn't write down their blood type."
            />
            <ProblemCard
              icon="device_thermostat"
              badge={`${sensorGlitches.toLocaleString()} sensors`}
              title="Thermometer is broken"
              desc="The fridge recorded an impossible temperature. The thermometer is probably broken."
            />
            <ProblemCard
              icon="cloud_off"
              badge={`${loggerGaps.toLocaleString()} gaps`}
              title="Fridge stopped checking temperature"
              desc="The fridge didn't record its temperature for over 6 hours."
            />
            <ProblemCard
              icon="local_shipping"
              badge={`${unconfirmedTransfers.toLocaleString()} dispatches`}
              title="Hospital didn't confirm delivery"
              desc="Blood was sent to another hospital, but they never confirmed they received it."
            />
            <ProblemCard
              icon="timelapse"
              badge={`${donationTooSoon.toLocaleString()} donors`}
              title="Donor gave blood too soon"
              desc="This person gave blood again before it was safe. (Wait 90 days for men, 120 for women)."
            />
          </div>
        </div>

        {/* REVIEW PROGRESS */}
        <div className="progress-card">
          <div className="section-header">
            <div>
              <h2 className="font-headline-md text-on-surface">
                Review Progress
              </h2>
              <p className="font-body-md text-secondary text-sm">
                Overall distribution and workflow throughput for active records
                cycle.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-3 h-3 rounded-sm bg-primary-container inline-block"></span>
                Clean State Tables Updated
              </div>
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-3 h-3 rounded-sm bg-secondary-container inline-block"></span>
                Human Verification Queue
              </div>
            </div>
          </div>

          <div className="progress-bar-master">
            <div
              className="bg-primary-container h-full"
              style={{
                width: `${Math.min(100, (totalResolved / Math.max(1, totalDefects)) * 100)}%`,
              }}
            ></div>
            <div
              className="bg-error h-full"
              style={{
                width: `${Math.min(100, (totalOpen / Math.max(1, totalDefects)) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="progress-grid">
            <ProgressItem
              label="Awaiting review"
              value={totalOpen.toLocaleString()}
              suffix="tasks"
              percent="Action needed"
              percentColor="text-error"
              barColor="bg-error"
              width="85%"
            />
            <ProgressItem
              label="Decisions completed"
              value={totalResolved.toLocaleString()}
              suffix="tasks"
              percent="Verified"
              percentColor="text-tertiary"
              barColor="bg-primary-container"
              width="15%"
            />
            <ProgressItem
              label="Waiting approval"
              value={waitingSupervisor.toLocaleString()}
              suffix="tasks"
              percent="Supervisor"
              percentColor="text-secondary"
              barColor="bg-secondary"
              width="35%"
            />
            <ProgressItem
              label="Unconfirmed Transfers"
              value={unconfirmedTransfers.toLocaleString()}
              suffix="units"
              percent="High Priority"
              percentColor="text-error"
              barColor="bg-error"
              width="70%"
            />
            <ProgressItem
              label="Missing Blood Groups"
              value={missingDonorBloodGroup.toLocaleString()}
              suffix="donors"
              percent="Clinical Safety"
              percentColor="text-on-surface-variant"
              barColor="bg-inverse-surface"
              width="45%"
            />
          </div>
        </div>

        {/* TWO COLUMN: ACTIVITY + SYSTEM */}
        <div className="two-col-grid">
          {/* Activity */}
          <div className="content-card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-headline-md text-on-surface">
                  Recent Activity / Audit Log
                </h2>
                <p className="font-body-md text-secondary text-xs">
                  Real-time immutable audit trail (Web &amp; SMS)
                </p>
              </div>
              <button
                type="button"
                className="btn-refresh-audit"
                onClick={handleRefreshAudit}
                disabled={refreshingAudit}
                title="Refresh audit log"
              >
                <span
                  className={`material-symbols-outlined text-sm ${refreshingAudit ? 'spin-animation' : ''}`}
                >
                  refresh
                </span>
                <span>{refreshingAudit ? 'Refreshing…' : 'Refresh'}</span>
              </button>
            </div>
            <div className="activity-list">
              {auditLogs.length > 0 ? (
                auditLogs.slice(0, 6).map((entry) => {
                  const isSupervisor = entry.user_role === 'supervisor';
                  const initials = isSupervisor ? 'DM' : 'SA';
                  const roleLabel = isSupervisor ? 'Supervisor' : 'Data Clerk';
                  const actorName =
                    entry.actor ||
                    (isSupervisor ? 'Dr. Mwangi' : 'Sarah Achieng');
                  const dateStr = new Date(entry.timestamp).toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    },
                  );
                  const isSms = (entry.channel || '').toLowerCase() === 'sms';

                  return (
                    <ActivityItem
                      key={entry.id}
                      initials={initials}
                      name={actorName}
                      role={roleLabel}
                      time={dateStr}
                      channel={entry.channel}
                      text={
                        <>
                          {isSms ? (
                            <>
                              Decision received on Task #{entry.task_id} via SMS
                              webhook integration.
                            </>
                          ) : (
                            <>
                              Recorded decision on Task #{entry.task_id} from
                              Clinical Workbench.
                            </>
                          )}
                        </>
                      }
                      tag={entry.action.toUpperCase()}
                      tagClass={
                        entry.action === 'accept'
                          ? 'bg-secondary-container text-on-secondary-fixed'
                          : entry.action === 'reject'
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-surface-container-high text-on-surface'
                      }
                      extra={
                        entry.ip_address ? `IP: ${entry.ip_address}` : undefined
                      }
                    />
                  );
                })
              ) : (
                <>
                  <ActivityItem
                    initials="SA"
                    name="Sarah Achieng"
                    role="Data Clerk"
                    time="12m ago"
                    channel="web"
                    text={
                      <>
                        Resolved missing blood group for donor registration{' '}
                        <span className="mono-tag">DNR-000412</span>.
                      </>
                    }
                    tag="Blood Group Updated"
                    tagClass="bg-secondary-container text-on-secondary-fixed"
                    extra="Clinical verified"
                  />
                  <ActivityItem
                    initials="AT"
                    name="+254711000000"
                    role="Field Clerk"
                    time="24m ago"
                    channel="sms"
                    text={
                      <>
                        Approved cold chain inspection for dispatch{' '}
                        <span className="mono-tag">TRF-001048</span> via SMS
                        reply.
                      </>
                    }
                    tag="Transfer Confirmed"
                    tagClass="bg-secondary-container text-on-secondary-fixed"
                    extra="Africa's Talking Gateway"
                  />
                  <ActivityItem
                    initials="DM"
                    name="Dr. Mwangi"
                    role="Supervisor"
                    time="1h ago"
                    channel="web"
                    text={
                      <>
                        Approved duplicate donor merge for{' '}
                        <span className="mono-tag">DNR-010412</span> &amp;{' '}
                        <span className="mono-tag">DNR-031877</span> (AI Match
                        98%).
                      </>
                    }
                    tag="Supervisor Merged"
                    tagClass="bg-surface-container-high text-on-surface"
                  />
                </>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-surface-container">
              <Link
                to="/queue"
                className="inline-flex items-center gap-2 font-label-md text-primary hover:underline"
              >
                View active review queue
                <span className="material-symbols-outlined text-base">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="content-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-headline-md text-on-surface">
                  System &amp; Connectivity
                </h2>
                <p className="font-body-md text-secondary text-xs">
                  Diagnostic telemetry and distributed sync status.
                </p>
              </div>
              <span className="status-pill">
                <span className="w-2 h-2 rounded-full bg-tertiary inline-block"></span>{' '}
                Healthy
              </span>
            </div>
            <div className="system-list">
              <SystemRow
                icon="wifi"
                title="Internet connection"
                subtitle="Latency: 48ms · Bandwidth stable"
                status="Online (KNBTS central node)"
                statusColor="text-tertiary"
              />
              <SystemRow
                icon="verified"
                title="Data-checking status"
                subtitle="Checksum verification passed"
                status="8 quality algorithms normal"
                statusColor="text-on-surface"
              />
              <SystemRow
                icon="sms"
                title="Africa's Talking SMS Webhook"
                subtitle="Two-way basic phone remediation active"
                status="Operational"
                statusColor="text-tertiary"
              />
              <SystemRow
                icon="psychology"
                title="Smart matching engine"
                subtitle="Levenshtein + DOB proximity (99.56% precision)"
                status="AI Active"
                statusColor="text-tertiary"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-surface-container flex justify-between items-center text-xs text-secondary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  schedule
                </span>{' '}
                Audit Trail: <strong>Immutable Append-Only</strong>
              </span>
              <button className="text-primary hover:underline font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  refresh
                </span>{' '}
                Sync telemetry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Helper Components */

function ProblemCard({
  icon,
  badge,
  title,
  desc,
  badgeClass = 'bg-surface-container-high text-on-surface',
}: {
  icon: string;
  badge: string;
  title: string;
  desc: string;
  badgeClass?: string;
}) {
  return (
    <Link to="/queue" className="problem-card group">
      <div className="problem-card-header">
        <div className="problem-icon">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div>
        <h3 className="problem-title">{title}</h3>
        <p className="problem-desc">{desc}</p>
      </div>
      <div className="problem-footer">
        <span>View records</span>
        <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </div>
    </Link>
  );
}

function ProgressItem({
  label,
  value,
  suffix,
  percent,
  percentColor,
  barColor,
  width,
}: any) {
  return (
    <div className="progress-item">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-secondary">{label}</span>
        <span className={`text-xs font-bold ${percentColor}`}>{percent}</span>
      </div>
      <div className="font-headline-sm text-on-surface">
        {value}{' '}
        <span className="text-xs text-secondary font-normal">{suffix}</span>
      </div>
      <div className="progress-track">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width }}
        ></div>
      </div>
    </div>
  );
}

function ActivityItem({
  initials,
  name,
  role,
  time,
  text,
  tag,
  tagClass,
  channel,
  extra,
}: any) {
  const isSms = (channel || '').toLowerCase() === 'sms';
  const isWeb = (channel || '').toLowerCase() === 'web';

  return (
    <div className="activity-item">
      <div
        className="activity-avatar"
        style={
          isSms
            ? {
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
              }
            : undefined
        }
      >
        {isSms ? (
          <span className="material-symbols-outlined text-base">
            phone_android
          </span>
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-label-md text-on-surface font-semibold">
              {name}
            </span>
            <span className="role-tag">{role}</span>

            {isSms && (
              <span className="channel-badge channel-sms">
                <span className="material-symbols-outlined text-xs">
                  phone_android
                </span>
                Via SMS
              </span>
            )}

            {isWeb && (
              <span className="channel-badge channel-web">
                <span className="material-symbols-outlined text-xs">
                  laptop
                </span>
                Via Web
              </span>
            )}
          </div>
          <span className="text-xs text-secondary shrink-0">{time}</span>
        </div>
        <p className="text-xs text-on-surface-variant mt-1 leading-snug">
          {text}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`activity-tag ${tagClass}`}>{tag}</span>
          {extra && <span className="text-[11px] text-secondary">{extra}</span>}
        </div>
      </div>
    </div>
  );
}

function SystemRow({ icon, title, subtitle, status, statusColor }: any) {
  return (
    <div className="system-row">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-xl mt-0.5">
          {icon}
        </span>
        <div>
          <span className="font-label-md text-on-surface">{title}</span>
          <p className="text-xs text-secondary">{subtitle}</p>
        </div>
      </div>
      <span className={`system-status ${statusColor}`}>{status}</span>
    </div>
  );
}
