/* ==========================================================================
   packages/web/src/pages/Dashboard.tsx
   ========================================================================== */
import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export function Dashboard() {
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
                Welcome back, Sarah{' '}
                <span className="text-secondary font-normal">(Data Clerk)</span>
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
                  Last automated check completed 14 minutes ago (Batch
                  #KE-2025-084)
                </span>
              </div>
            </div>
            <div className="hero-actions">
              <Link to="/queue" className="btn-hero-primary">
                <span className="material-symbols-outlined">play_arrow</span>
                Continue reviewing (24 open tasks)
              </Link>
              <button className="btn-hero-secondary">
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
              <div className="font-headline-xl text-on-surface">14,820</div>
              <p className="font-label-sm text-secondary mt-1">
                Across 4 counties this month
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
                  24
                </span>
                <span className="text-xs font-label-sm text-secondary">
                  action needed
                </span>
              </div>
              <p className="font-label-sm text-on-surface-variant font-medium mt-1">
                18 high confidence suggestions
              </p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="font-label-md text-secondary">
                Records reviewed
              </span>
              <div className="metric-icon">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
            </div>
            <div>
              <div className="font-headline-xl text-on-surface">312</div>
              <p className="font-label-sm text-secondary mt-1">
                Reviewed by you & team this week
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
              <div className="font-headline-xl text-primary">6</div>
              <p className="font-label-sm text-secondary mt-1">
                Sent to supervisor Dr. Mwangi
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
              8 Rule-Sets Run · 24 Total Open
            </span>
          </div>

          <div className="problems-grid">
            <ProblemCard
              icon="people"
              badge="8 records"
              badgeClass="bg-error-container text-on-error-container"
              title="Possible duplicate donors"
              desc="Two records may belong to the same person with minor typos or alternate ID numbers."
            />
            <ProblemCard
              icon="domain_disabled"
              badge="5 records"
              title="Facility names that do not match"
              desc='Non-standard names like "NATL REFERRAL" vs Master Health Facility List register.'
            />
            <ProblemCard
              icon="bloodtype"
              badge="4 records"
              title="Missing blood group info"
              desc="Donor logged without confirmed ABO/Rh typing entered prior to bag barcode issuance."
            />
            <ProblemCard
              icon="emergency"
              badge="2 urgent"
              badgeClass="bg-error-container text-on-error-container"
              title="Unknown patient blood group"
              desc="Emergency requisition received with recipient blood group omitted in hospital ward order."
            />
            <ProblemCard
              icon="device_thermostat"
              badge="2 sensors"
              title="Unusual temperature readings"
              desc="Sensor data anomaly detected: impossible fridge log value recorded (-99°C)."
            />
            <ProblemCard
              icon="cloud_off"
              badge="1 record"
              title="Missing temperature readings"
              desc="Cold-chain logger missing data between 02:00-09:00 at Machakos satellite depot."
            />
            <ProblemCard
              icon="local_shipping"
              badge="1 dispatch"
              title="Transfers without confirmation"
              desc="Dispatched unit #UN-8842 missing receipt acknowledgement from Kiambu Level 5."
            />
            <ProblemCard
              icon="timelapse"
              badge="1 donor"
              title="Donations too close together"
              desc="Donor donated 42 days ago; regulatory minimum whole blood interval is 90 days."
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
                Completed (89.9%)
              </div>
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className="w-3 h-3 rounded-sm bg-secondary-container inline-block"></span>
                In Pipeline (10.1%)
              </div>
            </div>
          </div>

          <div className="progress-bar-master">
            <div
              className="bg-primary-container h-full"
              style={{ width: '89.9%' }}
            ></div>
            <div className="bg-error h-full" style={{ width: '6.9%' }}></div>
            <div
              className="bg-secondary h-full"
              style={{ width: '1.7%' }}
            ></div>
          </div>

          <div className="progress-grid">
            <ProgressItem
              label="Awaiting review"
              value="24"
              suffix="tasks"
              percent="75% of open"
              percentColor="text-error"
              barColor="bg-error"
              width="75%"
            />
            <ProgressItem
              label="In progress"
              value="3"
              suffix="tasks"
              percent="Active now"
              percentColor="text-secondary"
              barColor="bg-secondary-fixed-dim"
              width="15%"
            />
            <ProgressItem
              label="Decisions completed"
              value="312"
              suffix="tasks"
              percent="Verified"
              percentColor="text-tertiary"
              barColor="bg-primary-container"
              width="90%"
            />
            <ProgressItem
              label="Waiting approval"
              value="6"
              suffix="tasks"
              percent="Supervisor"
              percentColor="text-secondary"
              barColor="bg-secondary"
              width="25%"
            />
            <ProgressItem
              label="Escalated records"
              value="2"
              suffix="tasks"
              percent="Lab Chief"
              percentColor="text-on-surface-variant"
              barColor="bg-inverse-surface"
              width="10%"
            />
          </div>
        </div>

        {/* TWO COLUMN: ACTIVITY + SYSTEM */}
        <div className="two-col-grid">
          {/* Activity */}
          <div className="content-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-headline-md text-on-surface">
                  Recent Activity
                </h2>
                <p className="font-body-md text-secondary text-xs">
                  Real-time audit log of local and supervisory actions.
                </p>
              </div>
              <span className="material-symbols-outlined text-secondary">
                history
              </span>
            </div>
            <div className="activity-list">
              <ActivityItem
                initials="SA"
                name="Sarah Achieng"
                role="Data Clerk"
                time="22m ago"
                text={
                  <>
                    Accepted suggested duplicate link for donor records{' '}
                    <span className="mono-tag">DNR-000412</span> &amp;{' '}
                    <span className="mono-tag">DNR-031877</span>.
                  </>
                }
                tag="Duplicate Merged"
                tagClass="bg-secondary-container text-on-secondary-fixed"
                extra="Confidence 96%"
              />
              <ActivityItem
                initials="DM"
                name="Dr. Mwangi"
                role="Supervisor"
                time="1h ago"
                text={
                  <>
                    Approved facility alias mapping: normalized{' '}
                    <em>"NATL REFERRAL"</em> to official MFL ID{' '}
                    <span className="mono-tag">HSP-001</span>.
                  </>
                }
                tag="Registry Updated"
                tagClass="bg-surface-container-high text-on-surface"
              />
              <ActivityItem
                initials="SYS"
                name="Automated Sync Pipeline"
                role="System"
                time="2h ago"
                text={
                  <>
                    Processed incoming batch{' '}
                    <span className="mono-tag">KNBTS_Batch_084.csv</span> (1,240
                    records checked). Flagged 3 new anomalies.
                  </>
                }
                tag="1,240 Parsed"
                tagClass="bg-secondary-container text-on-secondary-fixed"
                extra="Zero dropped rows"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-surface-container">
              <Link
                to="/audit"
                className="inline-flex items-center gap-2 font-label-md text-primary hover:underline"
              >
                View full activity history
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
                icon="sync"
                title="Offline synchronization"
                subtitle="Local IndexedDB write-ahead log"
                status="0 pending (All synchronized)"
                statusColor="text-on-surface-variant"
              />
              <SystemRow
                icon="psychology"
                title="Smart matching engine"
                subtitle="Fuzzy score threshold ≥ 85%"
                status="Probabilistic + Levenshtein"
                statusColor="text-on-surface"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-surface-container flex justify-between items-center text-xs text-secondary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  schedule
                </span>{' '}
                Last successful check: <strong>Today at 10:42 AM</strong>
              </span>
              <button className="text-primary hover:underline font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  refresh
                </span>{' '}
                Run manual check
              </button>
            </div>
          </div>
        </div>

        {/* UPLOAD SECTION */}
        <div className="content-card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-headline-md text-on-surface">
                Upload and Check Records
              </h2>
              <p className="font-body-md text-secondary text-sm">
                Import raw facility logs to flag anomalies without modifying
                source registries.
              </p>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-primary text-xs font-label-sm font-semibold hover:underline"
            >
              <span className="material-symbols-outlined text-base">
                download
              </span>{' '}
              Download standard template (.CSV)
            </a>
          </div>
          <div className="upload-dropzone">
            <div className="upload-icon">
              <span className="material-symbols-outlined text-3xl">
                cloud_upload
              </span>
            </div>
            <h3 className="font-headline-sm text-on-surface">
              Drag &amp; drop records dataset here
            </h3>
            <p className="font-body-md text-secondary text-sm mt-1 mb-4">
              Accepts CSV, XLSX or TSV exports from District Health Information
              Software (DHIS2) or blood bank fridges.
            </p>
            <label className="btn-hero-primary cursor-pointer">
              <span className="material-symbols-outlined">folder_open</span>
              <span>Select CSV or Excel file</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" />
            </label>
          </div>
          <div className="safeguard-reassurance">
            <span className="material-symbols-outlined text-primary text-2xl">
              verified_user
            </span>
            <div>
              <span className="font-label-md text-on-surface font-bold">
                Guaranteed Operational Safety Principle
              </span>
              <p className="font-body-md text-secondary text-sm mt-1">
                <strong>Reassurance:</strong> Checking records does NOT alter or
                overwrite raw hospital data. UnitTrace operates as a read-only
                analysis layer, flagging potential issues for human review and
                supervisor sign-off before any downstream action is permitted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Helper Components to keep the file clean */

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
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="problem-icon">
            <span className="material-symbols-outlined">{icon}</span>
          </span>
          <span className={`problem-badge ${badgeClass}`}>{badge}</span>
        </div>
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
  extra,
}: any) {
  return (
    <div className="activity-item">
      <div className="activity-avatar">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-label-md text-on-surface font-semibold">
              {name}
            </span>
            <span className="role-tag">{role}</span>
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
