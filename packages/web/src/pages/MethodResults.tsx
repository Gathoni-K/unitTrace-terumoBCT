import { useState } from 'react';
import './MethodResults.css';

export function MethodResults() {
  const [isSmartMode, setIsSmartMode] = useState(true);

  return (
    <div className="methods-container">
      <div className="methods-header">
        <div>
          <h1 className="font-headline-lg text-on-surface">
            How Well Does Duplicate Detection Work?
          </h1>
          <p className="font-body-md text-secondary">
            Comparing simple hospital rules against UnitTrace Smart AI matching on 43,363 Kenyan donor records.
          </p>
        </div>
      </div>

      {/* The Toggle */}
      <div className="toggle-card">
        <div className="toggle-info">
          <h3 className="font-label-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              psychology
            </span>
            Smart AI Matching
          </h3>
          <p className="text-sm text-secondary">
            Uses smart name spelling and birth date checks to find true duplicate donors without drowning staff in false alarms.
          </p>
        </div>
        <button
          type="button"
          className={`toggle-switch ${isSmartMode ? 'active' : ''}`}
          onClick={() => setIsSmartMode(!isSmartMode)}
          aria-label="Toggle smart matching"
        >
          <span className="toggle-knob" />
        </button>
      </div>

      {/* The Results */}
      <div className="results-grid">
        {/* Baseline Card */}
        <div className={`result-card ${!isSmartMode ? 'highlight' : ''}`}>
          <div className="result-header">
            <h3 className="font-headline-sm text-on-surface">
              Standard Rule (Sex + County + Phone)
            </h3>
            <span className="result-badge badge-warning">Basic Rules</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Total pairs flagged</span>
            <span className="metric-value">5,581</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Real duplicates found</span>
            <span className="metric-value">452</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Wrongly flagged (false alarms)</span>
            <span className="metric-value text-error">5,129</span>
          </div>
          <div className="metric-row border-top">
            <span className="metric-label font-bold text-on-surface">
              Accuracy (Precision)
            </span>
            <span className="metric-value text-error font-bold">8.10%</span>
          </div>
          <div className="metric-row">
            <span className="metric-label font-bold text-on-surface">
              Catch rate (Recall)
            </span>
            <span className="metric-value">100.0%</span>
          </div>
        </div>

        {/* AI Card */}
        <div
          className={`result-card ${isSmartMode ? 'highlight highlight-primary' : ''}`}
        >
          <div className="result-header">
            <h3 className="font-headline-sm text-on-surface">
              UnitTrace Smart AI Matcher
            </h3>
            <span className="result-badge badge-success">Smart AI</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Total pairs flagged</span>
            <span className="metric-value">454</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Real duplicates found</span>
            <span className="metric-value">452</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Wrongly flagged (false alarms)</span>
            <span className="metric-value text-success">2</span>
          </div>
          <div className="metric-row border-top">
            <span className="metric-label font-bold text-on-surface">
              Accuracy (Precision)
            </span>
            <span className="metric-value text-success font-bold">99.56%</span>
          </div>
          <div className="metric-row">
            <span className="metric-label font-bold text-on-surface">
              Catch rate (Recall)
            </span>
            <span className="metric-value">100%</span>
          </div>
        </div>
      </div>

      {/* The "Why this matters" callout */}
      <div className="callout-box">
        <span className="material-symbols-outlined text-primary text-2xl shrink-0">
          insights
        </span>
        <div>
          <h3 className="font-label-md text-on-surface">
            What these numbers mean for hospital staff
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            A simple rule checking gender, county, and phone number catches all real duplicates, but it produces <strong>5,129 false alarms</strong> — forcing busy clerks to spend hours reviewing people who are completely different.
          </p>
          <p className="text-sm text-on-surface-variant mt-2">
            UnitTrace Smart AI catches the exact same 452 real duplicates, but reduces false alarms to just <strong>2</strong> (99.56% accuracy). This cuts review workload by <strong>91.9%</strong>, making daily checks fast, reliable, and practical.
          </p>
        </div>
      </div>

      {/* If Rules Only mode */}
      {!isSmartMode && (
        <div className="fallback-box">
          <span className="material-symbols-outlined text-warning">
            warning
          </span>
          <div>
            <h3 className="font-label-md text-on-surface">
              Smart Matching is Offline
            </h3>
            <p className="text-sm text-on-surface-variant">
              The system is currently running on basic safety rules only. Confidence scores and smart duplicate suggestions are paused.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
