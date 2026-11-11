import { useState } from 'react';
import './MethodResults.css';

export function MethodResults() {
  const [isSmartMode, setIsSmartMode] = useState(true);

  return (
    <div className="methods-container">
      <div className="methods-header">
        <div>
          <h1 className="font-headline-lg text-on-surface">
            Matching Method Results
          </h1>
          <p className="font-body-md text-secondary">
            How well does the duplicate donor detection work?
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
            Smart Matching (AI)
          </h3>
          <p className="text-sm text-secondary">
            Uses fuzzy logic (Levenshtein distance, date proximity) to find true
            duplicates.
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
              Human Heuristic Baseline
            </h3>
            <span className="result-badge badge-warning">Rules Only</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Pairs detected</span>
            <span className="metric-value">5,581</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">True positives</span>
            <span className="metric-value">452</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">False positives</span>
            <span className="metric-value text-error">5,129</span>
          </div>
          <div className="metric-row border-top">
            <span className="metric-label font-bold text-on-surface">
              Precision
            </span>
            <span className="metric-value text-error font-bold">8.10%</span>
          </div>
          <div className="metric-row">
            <span className="metric-label font-bold text-on-surface">
              Recall
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
              AI Fuzzy Matcher
            </h3>
            <span className="result-badge badge-success">Smart</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Pairs detected</span>
            <span className="metric-value">454</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">True positives</span>
            <span className="metric-value">452</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">False positives</span>
            <span className="metric-value text-success">2</span>
          </div>
          <div className="metric-row border-top">
            <span className="metric-label font-bold text-on-surface">
              Precision
            </span>
            <span className="metric-value text-success font-bold">99.56%</span>
          </div>
          <div className="metric-row">
            <span className="metric-label font-bold text-on-surface">
              Recall
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
            What these numbers mean
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            The rule-based baseline finds all real duplicates (100% recall), but
            it flags <strong>93,987 false positives</strong> — meaning clerks
            would waste hours checking records of people who are not duplicates.
            The AI Fuzzy Matcher finds the same real duplicates, but reduces
            false positives to just <strong>2</strong>, making it practically
            usable for daily review.
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
              The system has fallen back to rule-based checks only. Confidence
              scores are not available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
