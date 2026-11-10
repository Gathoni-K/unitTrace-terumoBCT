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
  return {
    type: finding.type,
    record_ids: JSON.stringify(finding.recordIds),
    suggestion: JSON.stringify(finding.suggestion),
    reason: finding.reason,
    confidence: finding.confidence,
    source: finding.source,
    dedupe_key: finding.dedupeKey ?? null,
  };
}

