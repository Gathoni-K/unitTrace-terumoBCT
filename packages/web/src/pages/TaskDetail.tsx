/* ==========================================================================
   packages/web/src/pages/TaskDetail.tsx
   ========================================================================== */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTask,
  revealTaskPii,
  submitDecisionWithOfflineSync,
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
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

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    try {
      const unmaskedTask = await revealTaskPii(id);
      setTask(unmaskedTask);
      setPiiRevealed(true);
      showToast(
        'warning',
        '⚠️ PII Revealed. This action has been logged to the audit trail.',
      );
    } catch (err) {
      showToast('error', `Failed to reveal PII: ${(err as Error).message}`);
    } finally {
      setRevealingPii(false);
    }
  };

  const handleDecision = async (action: 'accept' | 'change' | 'reject') => {
    if (!id) return;
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
      const e = err as Error & { status?: number };
      if (e.status === 403) {
        showToast(
          'error',
          'Forbidden: Only supervisors can approve duplicate merges. Please switch to Supervisor role.',
        );
      } else {
        showToast('error', e.message || 'Failed to submit decision.');
      }
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
  const observedValue = suggestion?.observedValue;

  return (
    <div className="task-detail-container">
      <button className="btn-back" onClick={() => navigate('/queue')}>
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
          <p className="font-body-md text-on-surface-variant">{task.reason}</p>
        </div>
      </div>

      <div className="comparison-grid">
        <div className="record-card">
          <div className="record-header">
            <h3 className="font-label-md">Record A</h3>
            <span className="mono-tag">{task.recordIds[0]}</span>
          </div>
          <div className="record-body">
            {!piiRevealed && (
              <button
                className="btn-reveal-pii"
                onClick={handleRevealPii}
                disabled={revealingPii}
              >
                <span className="material-symbols-outlined">visibility</span>
                {revealingPii ? 'Revealing…' : 'Reveal PII'}
              </button>
            )}
            {piiRevealed && (
              <div className="pii-revealed-banner">
                <span className="material-symbols-outlined">warning</span>
                <span>PII Revealed — action logged to audit trail</span>
              </div>
            )}
            {observedValue !== undefined && (
              <div className="field-row">
                <span className="field-label">Observed Value</span>
                <span className="field-value text-error font-bold">
                  {String(observedValue)}
                </span>
              </div>
            )}
            <div className="field-row">
              <span className="field-label">Detected by</span>
              <span className="field-value">
                {task.source === 'smart' ? 'AI Fuzzy Matcher' : 'Rule Engine'}
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
              <span className="mono-tag">{task.recordIds[1]}</span>
            </div>
            <div className="record-body">
              <div className="field-row">
                <span className="field-label">Reference ID</span>
                <span className="field-value">{task.recordIds[1]}</span>
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
      ) : (
        <div className="action-area">
          <h3 className="font-label-lg text-on-surface mb-2">
            What would you like to do?
          </h3>
          <div className="form-group mb-4">
            <label className="font-label-sm text-secondary block mb-1">
              Optional note (required for Reject)
            </label>
            <textarea
              className="note-input"
              placeholder="Add context for the audit trail..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="action-buttons">
            <button
              className="btn-accept"
              onClick={() => handleDecision('accept')}
              disabled={actionLoading}
            >
              <span className="material-symbols-outlined">check</span>
              Accept
            </button>
            <button
              className="btn-change"
              onClick={() => handleDecision('change')}
              disabled={actionLoading}
            >
              <span className="material-symbols-outlined">edit</span>
              Change
            </button>
            <button
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
