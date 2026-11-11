/* ==========================================================================
   packages/web/src/components/AuditPanel.tsx
   ========================================================================== */
import { useEffect, useState } from 'react';
import { getAuditEntries, type AuditLogItem } from '../api';
import './AuditPanel.css';

export function AuditPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = () => {
    setLoading(true);
    getAuditEntries()
      .then((res) => setEntries(res.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) fetchEntries();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="audit-backdrop" onClick={onClose} />
      <aside className="audit-panel">
        <div className="audit-header">
          <h2 className="font-headline-sm text-on-surface">Audit Log</h2>
          <button className="icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="audit-actions">
          <button className="btn-refresh" onClick={fetchEntries}>
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </div>
        <div className="audit-list">
          {loading && (
            <p className="text-sm text-secondary p-4">Loading audit trail…</p>
          )}
          {!loading && entries.length === 0 && (
            <p className="text-sm text-secondary p-4">
              No recent entries found.
            </p>
          )}
          {entries.map((entry, i) => (
            <div key={entry.id || i} className="audit-entry">
              <div className="audit-entry-top">
                <span className="audit-action">
                  {String(entry.action ?? 'unknown').toUpperCase()}
                </span>
                <span
                  className={`audit-channel channel-${String(entry.channel ?? 'web').toLowerCase()}`}
                >
                  {String(entry.channel ?? 'web').toUpperCase()}
                </span>
              </div>
              <p className="audit-meta">
                Task #{String(entry.task_id ?? 'N/A')} ·{' '}
                {String(entry.actor ?? entry.user_id ?? 'System')}
              </p>
              <p className="audit-time">
                {new Date(
                  String(entry.timestamp ?? Date.now()),
                ).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
