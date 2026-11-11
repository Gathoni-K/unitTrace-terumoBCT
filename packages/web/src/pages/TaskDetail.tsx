/* ==========================================================================
   packages/web/src/pages/TaskDetail.tsx
   ========================================================================== */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers';
import {
  getTask,
  revealTaskPii,
  submitDecisionWithOfflineSync,
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
  type TaskRecord,
} from '../api';

import './TaskDetail.css';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();

  const currentRole: 'clerk' | 'supervisor' = role === 'supervisor' ? 'supervisor' : 'clerk';
  const userName = currentRole === 'supervisor' ? 'Dr. Mwangi (Supervisor)' : 'Sarah Achieng (Data Clerk)';
  const userId = currentRole === 'supervisor' ? 'supervisor-mwangi' : 'clerk-sarah';

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
        user_id: userId,
        actor: userName,
        user_role: currentRole,
        channel: 'web',
        note: note || undefined,
      });
      setIsQueuedOffline(res.status === 'queued');
      setDecisionMade(action);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="task-detail-container">
        <p>Loading task…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-detail-container">
        <p className="text-error">Error: {error}</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-container">
        <p>Task not found.</p>
      </div>
    );
  }

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
      <button type="button" className="btn-back" onClick={() => navigate('/queue')}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to queue
      </button>

      <div className="task-header">
        <div>
          <div className="flex items-center gap-3">
            <span className="mono-tag">#{task.id}</span>
            <span className="reviewer-pill">
              <span className="material-symbols-outlined text-sm">badge</span>
              Reviewer: <strong>{userName}</strong>
            </span>
          </div>
          <h1 className="font-headline-lg text-on-surface mt-2">
            {TASK_TYPE_LABELS[task.type] ?? task.type}
          </h1>
        </div>

        <div className={`confidence-badge confidence-${task.confidence} text-sm px-4 py-2`}>
          <span className="material-symbols-outlined text-base">verified</span>
          {task.confidence === 'rule' ? 'Rule-based flag' : `Confidence: ${task.confidence}`}
        </div>
      </div>

      {/* PII Masking & Reveal Notice */}
      {piiRevealed ? (
        <div className="pii-revealed-banner">
          <span className="material-symbols-outlined text-warning">warning</span>
          <span>⚠️ PII Revealed. Access has been logged to the immutable audit trail.</span>
        </div>
      ) : (
        <div className="pii-masked-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-sm">shield</span>
            <span className="text-xs text-secondary font-medium">
              Personal Data Masked (YYYY-XX-XX, XXXX) under Kenya Data Protection Act 2019.
            </span>
          </div>
          <button
            type="button"
            className="btn-reveal-pii"
            onClick={handleRevealPii}
            disabled={revealingPii}
            title="Break-glass audited unmasking"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            {revealingPii ? 'Unmasking…' : 'Reveal PII'}
          </button>
        </div>
      )}

      {/* Reason Box */}
      <div className="reason-box">
        <span className="material-symbols-outlined text-primary text-2xl shrink-0">
          info
        </span>
        <div>
          <h3 className="font-label-md text-on-surface mb-1">
            Why this was flagged
          </h3>
          <p className="font-body-md text-on-surface-variant">{task.reason}</p>
        </div>
      </div>

      {/* AI Smart Match Summary for Duplicate Donors */}
      {isGenuineAiMatch && similarityScorePct && similarityScorePct !== 'NaN%' && task.confidence !== 'rule' && (
        <div className="ai-summary-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h3 className="font-label-lg text-on-surface">AI Fuzzy Matching Analysis</h3>
            </div>
            <span className="ai-match-chip font-bold">
              Similarity Score: {similarityScorePct}
            </span>
          </div>
          <p className="text-xs text-secondary">
            Composite score derived from Levenshtein edit distance on county, day/month birth date proximity, and phone matching:
          </p>
          <div className="ai-chips-list">
            {matchedFields.map((f) => (
              <span key={f} className="ai-match-chip">
                <span className="material-symbols-outlined text-xs">check</span>
                {f === 'phone_last4'
                  ? 'Same Phone (Last 4 digits)'
                  : f === 'birth_date'
                  ? 'Matching Birth Date Proximity'
                  : f === 'home_county'
                  ? 'Matching County (Fuzzy)'
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
            <span className="mono-tag">{task.recordIds[0]}</span>
          </div>
          <div className="record-body">
            {isDuplicateDonor ? (
              <>
                <div className="field-row">
                  <span className="field-label">Donor Identifier</span>
                  <span className="field-value font-bold">{task.recordIds[0]}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Target Merge Action</span>
                  <span className="field-value text-primary font-semibold">Primary Profile (Retain)</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Phone Last 4</span>
                  <span className="field-value font-mono">{(suggestion as any)?.phone_last4 || (piiRevealed ? '****412' : 'XXXX')}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Birth Date</span>
                  <span className="field-value">{piiRevealed ? ((suggestion as any)?.birth_date || '1992-05-14') : '1992-XX-XX'}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Home County</span>
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
                  {String(suggestion.observedValue)}
                </span>
              </div>
            ) : (
              <div className="field-row">
                <span className="field-label">Defect Type</span>
                <span className="field-value text-error font-semibold">
                  {TASK_TYPE_LABELS[task.type] ?? task.type}
                </span>
              </div>
            )}

            <div className="field-row">
              <span className="field-label">Detected by</span>
              <span className="field-value">
                {task.source === 'smart' || task.source === 'ai' ? 'AI Fuzzy Matcher' : 'Rule Engine'}
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
              <h3 className="font-label-md">Record B (Comparison)</h3>
              <span className="mono-tag">{task.recordIds[1]}</span>
            </div>
            <div className="record-body">
              {isDuplicateDonor ? (
                <>
                  <div className="field-row">
                    <span className="field-label">Donor Identifier</span>
                    <span className="field-value font-bold">{task.recordIds[1]}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Proposed Merge Action</span>
                    <span className="field-value text-error font-semibold">Secondary Profile (Merge In)</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Phone Last 4</span>
                    <span className="field-value font-mono">{(suggestion as any)?.phone_last4 || (piiRevealed ? '****412' : 'XXXX')}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Birth Date</span>
                    <span className="field-value">{piiRevealed ? ((suggestion as any)?.birth_date_b || '1992-05-18') : '1992-XX-XX'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Home County</span>
                    <span className="field-value font-medium">{(suggestion as any)?.home_county_b || 'Nairobi'}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Matching Confidence</span>
                    <span className="field-value">
                      {similarityScorePct ?? (task.confidence === 'rule' ? 'Rule-based flag' : task.confidence)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="field-row">
                  <span className="field-label">Coupled Reference</span>
                  <span className="field-value font-mono">{task.recordIds[1]}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(task.type === 'implausible' || task.type === 'facility_name') && (
          <div className="record-card">
            <div className="record-header">
              <h3 className="font-label-md">Canonical Registry Resolution</h3>
              <span className="mono-tag text-success">DHIS2 Target</span>
            </div>
            <div className="record-body">
              <div className="field-row">
                <span className="field-label">Suggested Canonical Name</span>
                <span className="field-value text-success font-bold">
                  {facilityCanonicalName || 'Canonical Facility Registry Match'}
                </span>
              </div>
              <div className="field-row">
                <span className="field-label">DHIS2 Aggregation</span>
                <span className="field-value">Fix restores national reporting visibility</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lock notice */}
      <div className="lock-notice">
        <span className="material-symbols-outlined text-error">lock</span>
        <div>
          <strong className="text-on-surface">Clinical Safety & Audit Safeguard.</strong>
          <p className="text-sm text-on-surface-variant">
            Zero automated merges are permitted. Every modification is attributed to the current authenticated reviewer with client IP and role verification in the national audit trail.
          </p>
        </div>
      </div>

      {/* Action Area */}
      {isDecisionMade ? (
        <div
          className={`success-box ${
            isQueuedOffline ? 'bg-amber-50 border-amber-300 text-amber-900' : ''
          }`}
          style={
            isQueuedOffline
              ? { backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }
              : undefined
          }
        >
          <span
            className={`material-symbols-outlined text-3xl ${
              isQueuedOffline ? 'text-amber-700' : 'text-success'
            }`}
          >
            {isQueuedOffline ? 'cloud_off' : 'check_circle'}
          </span>
          <div>
            <h3
              className={`font-headline-sm ${
                isQueuedOffline ? 'text-amber-900' : 'text-success'
              }`}
            >
              Decision Recorded: {decisionMade.toUpperCase()}
            </h3>
            <p className="text-sm mt-1">
              {isQueuedOffline
                ? '⚠️ Offline: Decision queued locally. Will sync when connection returns.'
                : `The decision was successfully verified and committed to the audit trail by ${userName} (${currentRole.toUpperCase()}).`}
            </p>
          </div>
        </div>
      ) : (
        <div className="action-area">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-label-lg text-on-surface">
              Submit Review Decision
            </h3>
            <span className="text-xs text-secondary">
              Acting as: <strong>{userName}</strong>
            </span>
          </div>

          {isDuplicateDonor && currentRole === 'clerk' && (
            <div className="role-restriction-notice">
              <span className="material-symbols-outlined text-base">gpp_maybe</span>
              <span>
                <strong>Clinical RBAC Safeguard:</strong> Merging duplicate donor identities is restricted to <strong>Supervisors</strong>. As a Data Clerk, submitting a merge decision will be blocked.
              </span>
            </div>
          )}

          <div className="form-group mb-4">
            <label className="font-label-sm text-secondary block mb-1">
              Audit Note (Required for Reject, recommended for Accept/Change)
            </label>
            <textarea
              className="note-input"
              placeholder="Provide clinical rationale for the immutable audit log…"
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
              Accept & Fix
            </button>
            <button
              className="btn-change"
              onClick={() => handleDecision('change')}
              disabled={actionLoading}
            >
              <span className="material-symbols-outlined">edit</span>
              Change Suggestion
            </button>
            <button
              className="btn-reject"
              onClick={() => handleDecision('reject')}
              disabled={actionLoading || !note.trim()}
            >
              <span className="material-symbols-outlined">close</span>
              Reject Flag
            </button>
          </div>
          <p className="text-xs text-secondary text-center mt-3">
            Nothing is auto-corrected. Human-in-the-loop validation is enforced on every defect.
          </p>
        </div>
      )}
    </div>
  );
}
