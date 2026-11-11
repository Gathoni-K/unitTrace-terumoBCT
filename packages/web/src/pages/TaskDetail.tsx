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

      {/* Data Comparison Grid */}
      <div className="comparison-grid">
        <div className="record-card">
          <div className="record-header">
            <h3 className="font-label-md">Record A</h3>
            <span className="mono-tag">{formatRecordId(task.recordIds[0])}</span>
          </div>
          <div className="record-body">
            {isDuplicateDonor ? (
              <>
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
              </>
            ) : task.type === 'implausible' || task.type === 'facility_name' ? (
              <>
                <div className="field-row">
                  <span className="field-label">Observed Raw Name</span>
                  <span className="field-value text-error font-bold">{facilityRawName || 'Non-standard name'}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Registry Status</span>
                  <span className="field-value text-secondary">Unmatched in Master List</span>
                </div>
              </>
            ) : suggestion?.observedValue !== undefined ? (
              <div className="field-row">
                <span className="field-label">Observed Value</span>
                <span className="field-value text-error font-bold">
                  {String(suggestion?.observedValue)}
                </span>
              </div>
            ) : null}
            <div className="field-row">
              <span className="field-label">Detected by</span>
              <span className="field-value">
                {task.source === 'smart' ? 'AI Matching' : 'Safety Rule'}
              </span>
            </div>
            <div className="field-row">
              <span className="field-label">Date flagged</span>
              <span className="field-value">
                {new Date(task.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {task.recordIds.length > 1 && (
          <div className="record-card">
            <div className="record-header">
              <h3 className="font-label-md">Record B</h3>
              <span className="mono-tag">{formatRecordId(task.recordIds[1])}</span>
            </div>
            <div className="record-body">
              {isDuplicateDonor ? (
                <>
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
                </>
              ) : (
                <div className="field-row">
                  <span className="field-label">Linked Record</span>
                  <span className="field-value font-mono">{formatRecordId(task.recordIds[1])}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(task.type === 'implausible' || task.type === 'facility_name') && (
          <div className="record-card">
            <div className="record-header">
              <h3 className="font-label-md">Official Hospital Registry</h3>
              <span className="mono-tag text-success">National List</span>
            </div>
            <div className="record-body">
              <div className="field-row">
                <span className="field-label">Official Hospital ID</span>
                <span className="field-value">{formatRecordId(task.recordIds[1])}</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
      ) : currentRole === 'supervisor' ? (
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
      ) : null}
    </div>
  );
}
