import type { Finding } from '@workbench/shared';

export interface TaskRow {
  type: string;
  record_ids: string;
  suggestion: string;
  reason: string;
  confidence: string;
  source: string;
  dedupe_key: string | null;
}

export function toTaskRow(finding: Finding): TaskRow {
  const source = finding.source === 'ai' ? 'smart' : finding.source;
  let confidence: string;
  if (typeof finding.confidence === 'number') {
    if (finding.confidence >= 0.9) confidence = 'high';
    else if (finding.confidence >= 0.7) confidence = 'medium';
    else confidence = 'low';
  } else {
    confidence = String(finding.confidence);
  }

  return {
    type: finding.type,
    record_ids: JSON.stringify(finding.recordIds),
    suggestion: JSON.stringify(finding.suggestion),
    reason: finding.reason,
    confidence,
    source,
    dedupe_key: finding.dedupeKey ?? null,
  };
}

