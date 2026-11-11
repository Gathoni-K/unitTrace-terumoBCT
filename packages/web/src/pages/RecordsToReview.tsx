import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listTasks,
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
  formatFriendlyReason,
  formatRecordId,
  type TaskRecord,
} from '../api';
import './RecordsToReview.css';

const STATUS_TABS = [
  { key: 'open', label: 'All open', status: 'open' },
  {
    key: 'waiting_supervisor',
    label: 'Waiting for supervisor',
    status: 'open',
    type: 'duplicate_donor',
  },
  { key: 'done', label: 'Done', status: 'done' },
];

export function RecordsToReview({
  defaultTab = 'open',
}: { defaultTab?: string } = {}) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isAuditOpen, setIsAuditOpen] = useState(false); // For the Audit panel

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const activeTabConfig =
      STATUS_TABS.find((tab) => tab.key === activeTab) ?? STATUS_TABS[0];

    listTasks({
      status: activeTabConfig.status,
      type: activeTabConfig.type ?? (typeFilter || undefined),
      limit: 50,
    })
      .then((res) => {
        if (cancelled) return;
        setTasks(res.tasks);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, typeFilter, defaultTab]);

  const filtered = tasks.filter((t) => {
    if (!search) return true;
    const needle = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(needle) ||
      t.reason.toLowerCase().includes(needle) ||
      t.recordIds.some((r) => r.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="queue-container">
      <div className="queue-header">
        <div>
          <h1 className="font-headline-lg text-on-surface">
            Records to Review
          </h1>
          <p className="font-body-md text-secondary">
            {loading ? 'Loading…' : `${total} total tasks in this view`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="queue-meta">
            <span className="material-symbols-outlined text-primary">info</span>
            <span className="text-sm text-secondary">Live data</span>
          </div>
          <button
          type="button"
            className="btn-audit-log"
            onClick={() => setIsAuditOpen(!isAuditOpen)}
          >
            <span className="material-symbols-outlined">history</span>
            Audit Log
          </button>
        </div>
      </div>

      <div className="queue-tabs">
        {STATUS_TABS.map((tab) => (
          <button
          type="button"
            key={tab.key}
            className={`queue-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="queue-filters">
        <div className="search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Search by task ID, reason, or record…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="queue-error">
          <span className="material-symbols-outlined">error</span>
          <div>
            <strong>Could not load tasks.</strong>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="queue-table-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="queue-empty">
          <span className="material-symbols-outlined">inbox</span>
          <h3 className="font-headline-sm">No tasks in this view</h3>
          <p className="text-secondary">
            Try a different tab or clear the filters.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="queue-table-wrap desktop-only">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Confidence</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <span className="mono-tag">#{task.id}</span>
                    </td>
                    <td>
                      <div className="task-type-cell">
                        <span className="material-symbols-outlined task-type-icon">
                          {TASK_TYPE_ICONS[task.type] ?? 'warning'}
                        </span>
                        <span>{TASK_TYPE_LABELS[task.type] ?? task.type}</span>
                      </div>
                    </td>
                    <td className="reason-cell">{formatFriendlyReason(task.reason, task.type)}</td>
                    <td>
                      <span
                        className={`confidence-badge confidence-${task.confidence}`}
                      >
                        {task.confidence === 'rule' ? 'Rule' : task.confidence}
                      </span>
                    </td>
                    <td>
                      <span className={`source-badge source-${task.source}`}>
                        {task.source === 'smart' ? 'Smart' : 'Rule'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/tasks/${task.id}`} className="btn-open">
                        Open
                        <span className="material-symbols-outlined text-base">
                          arrow_forward
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="queue-cards mobile-only">
            {filtered.map((task) => (
              <Link
                to={`/tasks/${task.id}`}
                key={task.id}
                className="queue-card"
              >
                <div className="queue-card-header">
                  <span className="mono-tag">#{task.id}</span>
                  <span
                    className={`confidence-badge confidence-${task.confidence}`}
                  >
                    {task.confidence === 'rule' ? 'Rule' : task.confidence}
                  </span>
                </div>
                <div className="task-type-cell">
                  <span className="material-symbols-outlined task-type-icon">
                    {TASK_TYPE_ICONS[task.type] ?? 'warning'}
                  </span>
                  <strong>{TASK_TYPE_LABELS[task.type] ?? task.type}</strong>
                </div>
                <p className="queue-card-reason">{formatFriendlyReason(task.reason, task.type)}</p>
                <div className="queue-card-footer">
                  <span className="text-xs text-secondary">
                    {task.recordIds.map(formatRecordId).join(' · ')}
                  </span>
                  <span className="text-primary font-semibold text-sm">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
