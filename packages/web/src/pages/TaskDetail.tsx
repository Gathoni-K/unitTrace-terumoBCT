import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTask,
  revealTaskPii,
  submitDecisionWithOfflineSync,
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
  formatRecordId,
  formatFriendlyReason,
  type TaskRecord,
} from '../api';
import { useAuth } from '../providers';
import './TaskDetail.css';
import { useToast } from '../components/Toast';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { role } = useAuth();

  const currentRole: 'clerk' | 'supervisor' =
    role === 'supervisor' ? 'supervisor' : 'clerk';
  const userName =
    currentRole === 'supervisor'
      ? 'Dr. Mwangi (Supervisor)'
      : 'Sarah Achieng (Data Clerk)';
  const userId =
    currentRole === 'supervisor' ? 'supervisor-mwangi' : 'clerk-sarah';

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionMade, setDecisionMade] = useState<string | null>(null);
  const [isQueuedOffline, setIsQueuedOffline] = useState(false);
  const [note, setNote] = useState('');
  const [piiRevealed, setPiiRevealed] = useState(false);
  const [revealingPii, setRevealingPii] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTask(id)
      .then((t) => setTask(t))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRevealPii = async () => {
    if (!id) return;
    setRevealingPii(true);
    setErrorMsg(null);
    try {
      const unmaskedTask = await revealTaskPii(id, userId);
      setTask(unmaskedTask);
      setPiiRevealed(true);
      showToast(
        'warning',
        '⚠️ PII Revealed. This action has been logged to the audit trail.',
      );
    } catch (err) {
      setErrorMsg(`Failed to reveal PII: ${(err as Error).message}`);
    } finally {
      setRevealingPii(false);
    }
  };

  const handleDecision = async (action: 'accept' | 'change' | 'reject') => {
    if (!id) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      const res = await submitDecisionWithOfflineSync(id, {
        action,
        actor: userName,
        user_role: currentRole,
        channel: 'web',
        note: note || undefined,
      });
      setIsQueuedOffline(res.status === 'queued');
      setDecisionMade(action);
      showToast(
        'success',
        res.status === 'queued'
          ? `Decision queued offline. Will sync when connection returns.`
          : `Decision recorded: ${action.toUpperCase()}. Logged to audit trail.`,
      );
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="task-detail-container">
        <p>Loading task…</p>
      </div>
    );
  if (error)
    return (
      <div className="task-detail-container">
        <p className="text-error">Error: {error}</p>
      </div>
    );
  if (!task)
    return (
      <div className="task-detail-container">
        <p>Task not found.</p>
      </div>
    );

  const isDecisionMade = decisionMade !== null;
  const suggestion = task.suggestion as Record<string, unknown> | undefined;

  // Extract facility name details if applicable
  const rawFacilityMatch = task.reason.match(/Facility name '([^']+)'/);
  const canonicalFacilityMatch = task.reason.match(/registry '([^']+)'/);
  const facilityRawName = (suggestion?.observedValue as string) || (rawFacilityMatch ? rawFacilityMatch[1] : undefined);
  const facilityCanonicalName = (suggestion?.expected_name as string) || (canonicalFacilityMatch ? canonicalFacilityMatch[1] : undefined);

  // Extract duplicate donor details
  const isDuplicateDonor = task.type === 'duplicate_donor';
  const isDualRecord = task.type === 'duplicate_donor' || task.type === 'facility_name';
  const rawScore =
    typeof suggestion?.score === 'number'
      ? suggestion.score
      : typeof (suggestion as any)?.similarityScore === 'number'
      ? (suggestion as any).similarityScore
      : task.confidence !== 'rule' && !isNaN(Number(task.confidence))
      ? Number(task.confidence)
      : NaN;
  const isGenuineAiMatch = isDuplicateDonor && task.confidence !== 'rule' && !isNaN(rawScore);
  const similarityScorePct = isGenuineAiMatch ? `${Math.round(rawScore * 100)}%` : null;
  const matchedFields =
    (suggestion?.matched_fields as string[]) ||
    ((suggestion as any)?.matchBreakdown as string[]) ||
    ['phone_last4', 'home_county', 'birth_date'];

  return (
    <div className="task-detail-container">
      <button 
      type="button"
      className="btn-back" onClick={() => navigate('/queue')}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to queue
      </button>

      <div className="task-header">
        <div>
          <span className="mono-tag">#{task.id}</span>
          <h1 className="font-headline-lg text-on-surface mt-2">
            {TASK_TYPE_LABELS[task.type] ?? task.type}
          </h1>
        </div>
        <div
          className={`confidence-badge confidence-${task.confidence} text-sm px-4 py-2`}
        >
          <span className="material-symbols-outlined text-base">verified</span>
          {task.confidence === 'rule'
            ? 'Rule-based flag'
            : `Confidence: ${task.confidence}`}
        </div>
      </div>

      <div className="reason-box">
        <span className="material-symbols-outlined text-primary text-2xl shrink-0">
          info
        </span>
        <div>
          <h3 className="font-label-md text-on-surface mb-1">
            Why this was flagged
          </h3>
          <p className="font-body-md text-on-surface-variant">{formatFriendlyReason(task.reason, task.type)}</p>
        </div>
      </div>

      {/* AI Smart Match Summary for Duplicate Donors */}
      {isGenuineAiMatch && similarityScorePct && similarityScorePct !== 'NaN%' && task.confidence !== 'rule' && (
        <div className="ai-summary-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h3 className="font-label-lg text-on-surface">AI Matching Check</h3>
            </div>
            <span className="ai-match-chip font-bold">
              Match confidence: {similarityScorePct}
            </span>
          </div>
          <p className="text-xs text-secondary">
            Our AI compared county names, dates of birth, and phone numbers:
          </p>
          <div className="ai-chips-list">
            {matchedFields.map((f) => (
              <span key={f} className="ai-match-chip">
                <span className="material-symbols-outlined text-xs">check</span>
                {f === 'phone_last4'
                  ? 'Same phone ending'
                  : f === 'birth_date'
                  ? 'Same date of birth'
                  : f === 'home_county'
                  ? 'Same home county'
                  : f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PII Reveal Bar for Duplicate Donors */}
      {isDuplicateDonor && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--surface-container)', margin: '4px 0' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">
              {piiRevealed ? 'lock_open' : 'lock'}
            </span>
            <span className="text-sm text-on-surface">
              {piiRevealed
                ? 'Personal details unmasked (Date of birth & Phone ending)'
                : 'Personal details masked by default (Kenya Data Protection Act)'}
            </span>
          </div>
          {!piiRevealed ? (
            <button
              type="button"
              className="btn-reveal-pii"
              onClick={handleRevealPii}
              disabled={revealingPii}
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              {revealingPii ? 'Unmasking...' : 'Reveal PII (Logged)'}
            </button>
          ) : (
            <div className="pii-revealed-banner" style={{ padding: '4px 10px', borderRadius: '6px' }}>
              <span className="material-symbols-outlined text-sm">warning</span>
              <span className="text-xs font-semibold">PII Revealed — Logged to Access Log</span>
            </div>
          )}
        </div>
      )}

      {/* Data Comparison Grid (Only for duplicate_donor and facility_name) */}
      {isDualRecord ? (
        <div className="comparison-grid">
          {task.type === 'duplicate_donor' ? (
            <>
              <div className="record-card">
                <div className="record-header">
                  <h3 className="font-label-md">Record A</h3>
                  <span className="mono-tag">{formatRecordId(task.recordIds[0])}</span>
                </div>
                <div className="record-body">
                  <div className="field-row">
                    <span className="field-label">Donor ID</span>
                    <span className="field-value font-bold">{formatRecordId(task.recordIds[0])}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Target Merge Action</span>
                    <span className="field-value text-primary font-semibold">Primary Profile (Retain)</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Phone ending</span>
                    <span className="field-value font-mono">{(suggestion as any)?.phone_last4 || (piiRevealed ? '****412' : 'XXXX')}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Date of birth</span>
                    <span className="field-value">{piiRevealed ? ((suggestion as any)?.birth_date || '1992-05-14') : '1992-XX-XX'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Home county</span>
                    <span className="field-value font-medium">{(suggestion as any)?.home_county || 'Nairobi'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Detected by</span>
                    <span className="field-value">
                      {task.source === 'smart' ? 'AI Matching' : 'Safety Rule'}
                    </span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Date Flagged</span>
                    <span className="field-value">
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="record-card">
                <div className="record-header">
                  <h3 className="font-label-md">Record B</h3>
                  <span className="mono-tag">{formatRecordId(task.recordIds[1])}</span>
                </div>
                <div className="record-body">
                  <div className="field-row">
                    <span className="field-label">Donor ID</span>
                    <span className="field-value font-bold">{formatRecordId(task.recordIds[1])}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Proposed Merge Action</span>
                    <span className="field-value text-error font-semibold">Secondary Profile (Merge In)</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Phone ending</span>
                    <span className="field-value font-mono">{(suggestion as any)?.phone_last4 || (piiRevealed ? '****412' : 'XXXX')}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Date of birth</span>
                    <span className="field-value">{piiRevealed ? ((suggestion as any)?.birth_date_b || '1992-05-18') : '1992-XX-XX'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Home county</span>
                    <span className="field-value font-medium">{(suggestion as any)?.home_county_b || 'Nairobi'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Matching Confidence</span>
                    <span className="field-value">
                      {similarityScorePct ?? (task.confidence === 'rule' ? 'Rule-based check' : task.confidence)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="record-card">
                <div className="record-header">
                  <h3 className="font-label-md">Reported Hospital</h3>
                  <span className="mono-tag">{formatRecordId(task.recordIds[0])}</span>
                </div>
                <div className="record-body">
                  <div className="field-row">
                    <span className="field-label">Entered Hospital Name</span>
                    <span className="field-value text-error font-bold">{facilityRawName || 'Non-standard name'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Registry Status</span>
                    <span className="field-value text-secondary">Unmatched in Master List</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Detected by</span>
                    <span className="field-value">
                      {task.source === 'smart' ? 'AI Matching' : 'Safety Rule'}
                    </span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Date Flagged</span>
                    <span className="field-value">
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="record-card">
                <div className="record-header">
                  <h3 className="font-label-md">Official Hospital Registry</h3>
                  <span className="mono-tag text-success">National List</span>
                </div>
                <div className="record-body">
                  <div className="field-row">
                    <span className="field-label">Official Registry Name</span>
                    <span className="field-value text-primary font-bold">{facilityCanonicalName || 'Official Hospital Record'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Official Code</span>
                    <span className="field-value font-mono">{formatRecordId(task.recordIds[1] || task.recordIds[0])}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Target System</span>
                    <span className="field-value font-semibold">DHIS2 / KHIS Master List</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Recommended Action</span>
                    <span className="field-value text-success font-semibold">Standardize to Official Name</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Single Full-Width Card for non-duplicate tasks */
        <div className="record-card">
          {task.type === 'sensor_glitch' ? (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">Broken Fridge Sensor</h3>
                <span className="mono-tag text-error">Sensor Error</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Location</span>
                  <span className="field-value font-semibold">Facility {task.recordIds[0]}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Temperature Recorded</span>
                  <span className="field-value text-error font-bold">
                    {suggestion?.observedValue !== undefined
                      ? `${suggestion.observedValue}°C`
                      : '99.9°C'}
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-label">Date/Time</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Expected Safe Range</span>
                  <span className="field-value text-secondary">2°C to 6°C</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">Safety Rule</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> Fridges must be kept between 2°C and 6°C. A reading of {suggestion?.observedValue !== undefined ? `${suggestion.observedValue}°C` : '99.9°C'} is impossible and means the thermometer is broken.
                  </p>
                </div>
              </div>
            </>
          ) : task.type === 'missing_donor_blood_group' ? (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">Missing Blood Group</h3>
                <span className="mono-tag text-warning">Incomplete Record</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Donor ID</span>
                  <span className="field-value font-bold">{formatRecordId(task.recordIds[0])}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Blood Group Status</span>
                  <span className="field-value text-error font-semibold">Not recorded</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Date Flagged</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">Safety Rule</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> Without a blood group, this donor's blood cannot be safely given to a patient in an emergency.
                  </p>
                </div>
              </div>
            </>
          ) : task.type === 'unknown_patient_blood_group' ? (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">Missing Patient Blood Group</h3>
                <span className="mono-tag text-error">Urgent Request</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Emergency Request ID</span>
                  <span className="field-value font-bold">{formatRecordId(task.recordIds[0])}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Patient Blood Group</span>
                  <span className="field-value text-error font-semibold">Unknown / Missing</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Date Flagged</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">Safety Rule</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> This emergency request has no patient blood group listed. Doctors cannot check blood compatibility without this.
                  </p>
                </div>
              </div>
            </>
          ) : task.type === 'unconfirmed_transfer' ? (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">Missing Delivery Receipt</h3>
                <span className="mono-tag text-warning">Transit Incomplete</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Transfer ID</span>
                  <span className="field-value font-bold">{formatRecordId(task.recordIds[0])}</span>
                </div>
                {task.recordIds[1] && (
                  <div className="field-row">
                    <span className="field-label">Blood Unit ID</span>
                    <span className="field-value font-mono">{formatRecordId(task.recordIds[1])}</span>
                  </div>
                )}
                <div className="field-row">
                  <span className="field-label">Delivery Status</span>
                  <span className="field-value text-error font-semibold">No receipt confirmation received</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Date Flagged</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">Safety Rule</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> Blood was sent to another hospital, but they haven't confirmed they received it.
                  </p>
                </div>
              </div>
            </>
          ) : task.type === 'donation_too_soon' ? (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">Donor Gave Blood Too Soon</h3>
                <span className="mono-tag text-error">Safety Rule</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Donor ID</span>
                  <span className="field-value font-bold">{formatRecordId(task.recordIds[0])}</span>
                </div>
                {task.recordIds[1] && (
                  <div className="field-row">
                    <span className="field-label">Recent Donation</span>
                    <span className="field-value font-mono">{formatRecordId(task.recordIds[1])}</span>
                  </div>
                )}
                <div className="field-row">
                  <span className="field-label">Safety Rule</span>
                  <span className="field-value font-semibold">Wait 90 days for men, 120 days for women</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Date Flagged</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">Safety Rule</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> This person gave blood again before it was safe. (Wait 90 days for men, 120 days for women).
                  </p>
                </div>
              </div>
            </>
          ) : task.type === 'logger_gap' ? (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">Fridge Stopped Reporting</h3>
                <span className="mono-tag text-error">Logging Gap</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Location</span>
                  <span className="field-value font-semibold">Facility {task.recordIds[0]}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Reporting Dropout</span>
                  <span className="field-value text-error font-semibold">More than 6 hours without temperature data</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Date Flagged</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">Safety Rule</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> The fridge didn't record its temperature for more than 6 hours.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="record-header">
                <h3 className="font-label-md font-bold text-on-surface">{TASK_TYPE_LABELS[task.type] ?? task.type}</h3>
                <span className="mono-tag">{formatRecordId(task.recordIds[0])}</span>
              </div>
              <div className="record-body">
                <div className="field-row">
                  <span className="field-label">Record ID</span>
                  <span className="field-value font-bold">{formatRecordId(task.recordIds[0])}</span>
                </div>
                {task.recordIds[1] && (
                  <div className="field-row">
                    <span className="field-label">Related Record</span>
                    <span className="field-value font-mono">{formatRecordId(task.recordIds[1])}</span>
                  </div>
                )}
                {suggestion?.observedValue !== undefined && (
                  <div className="field-row">
                    <span className="field-label">Recorded Value</span>
                    <span className="field-value text-error font-bold">{String(suggestion.observedValue)}</span>
                  </div>
                )}
                <div className="field-row">
                  <span className="field-label">Date Flagged</span>
                  <span className="field-value">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Detected by</span>
                  <span className="field-value">{task.source === 'smart' ? 'AI Matching' : 'Safety Rule'}</span>
                </div>
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface-container, #f8fafc)', borderRadius: '8px' }}>
                  <p className="text-sm text-secondary">
                    <strong className="text-on-surface">Why this is a problem:</strong> {formatFriendlyReason(task.reason, task.type)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="lock-notice">
        <span className="material-symbols-outlined text-error">lock</span>
        <div>
          <strong className="text-on-surface">Sensitive field locked.</strong>
          <p className="text-sm text-on-surface-variant">
            Any changes to blood group or lab results require a qualified
            person. This cannot be changed by SMS or automatically.
          </p>
        </div>
      </div>

      {isDecisionMade ? (
        <div className="success-box">
          <span className="material-symbols-outlined text-success text-3xl">
            check_circle
          </span>
          <div>
            <h3 className="font-headline-sm text-success">
              Decision recorded: {decisionMade?.toUpperCase()}
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              {isQueuedOffline
                ? 'Queued offline. Will sync when connection returns.'
                : 'The change has been logged in the audit trail. If this requires supervisor approval, it will now appear in their queue.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="action-area">
          <h3 className="font-label-lg text-on-surface mb-2">
            What would you like to do?
          </h3>
          <div className="form-group mb-4">
            <label htmlFor="decision-audit-note" className="font-label-sm text-secondary block mb-1">
              Audit Note (Required for Reject, recommended for Accept/Change)
            </label>
            <textarea
              id="decision-audit-note"
              className="note-input"
              placeholder="Add context for the audit trail..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {errorMsg && (
            <div className="error-banner" style={{color: 'red', background: '#fee', padding: '10px', borderRadius: '4px', marginBottom: '10px'}}>
              ❌ {errorMsg}
            </div>
          )}

          <div className="action-buttons">
            <button
            type="button"
              className="btn-accept"
              onClick={() => handleDecision('accept')}
              disabled={actionLoading}
            >
              <span className="material-symbols-outlined">check</span>
              Accept
            </button>
            <button
            type="button"
              className="btn-change"
              onClick={() => handleDecision('change')}
              disabled={actionLoading}
            >
              <span className="material-symbols-outlined">edit</span>
              Change
            </button>
            <button
            type="button"
              className="btn-reject"
              onClick={() => handleDecision('reject')}
              disabled={actionLoading || !note.trim()}
            >
              <span className="material-symbols-outlined">close</span>
              Reject
            </button>
          </div>
          <p className="text-xs text-secondary text-center mt-3">
            Nothing is auto-corrected. A human decision is required for every
            change.
          </p>
        </div>
      )}
    </div>
  );
}
