/* ==========================================================================
   packages/web/src/pages/TaskDetail.tsx
   ========================================================================== */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTask,
  submitDecision,
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
  type TaskRecord,
} from '../api';
import './TaskDetail.css';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionMade, setDecisionMade] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTask(id)
      .then((t) => setTask(t))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecision = async (action: 'accept' | 'change' | 'reject') => {
    if (!id) return;
    setActionLoading(true);
    try {
      await submitDecision(id, {
        action,
        user_id: 'clerk-sarah',
        actor: 'Sarah Achieng',
        user_role: 'clerk',
        channel: 'web',
        note: note || undefined,
      });
      setDecisionMade(action);
    } catch (err) {
      alert(`Failed to submit decision: ${(err as Error).message}`);
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

      {/* Data Comparison */}
      <div className="comparison-grid">
        <div className="record-card">
          <div className="record-header">
            <h3 className="font-label-md">Record A</h3>
            <span className="mono-tag">{task.recordIds[0]}</span>
          </div>
          <div className="record-body">
            {observedValue !== undefined ? (
              <div className="field-row">
                <span className="field-label">Observed Value</span>
                <span className="field-value text-error font-bold">
                  {String(observedValue)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-secondary">
                No detailed field data available.
              </p>
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
              <p className="text-sm text-secondary">
                Coupled record for review.
              </p>
              <div className="field-row">
                <span className="field-label">Reference ID</span>
                <span className="field-value">{task.recordIds[1]}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lock notice */}
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

      {/* Action Area */}
      {isDecisionMade ? (
        <div className="success-box">
          <span className="material-symbols-outlined text-success text-3xl">
            check_circle
          </span>
          <div>
            <h3 className="font-headline-sm text-success">
              Decision recorded: {decisionMade.toUpperCase()}
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              The change has been logged in the audit trail. If this requires
              supervisor approval, it will now appear in their queue.
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
