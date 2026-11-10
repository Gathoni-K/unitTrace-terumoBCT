import { countryConfigSchema, type Finding } from '@workbench/shared';
import countryJson from '../config/country.kenya.json';
import { pool } from './lib/db.js';
import { run as runDuplicateDonors } from './detectors/duplicateDonors.js';
import { run as runFacilityNames } from './detectors/facilityNames.js';
import { run as runSensorGlitches } from './detectors/sensorGlitches.js';
import { run as runLoggerGaps } from './detectors/loggerGaps.js';
import { run as runMissingValues } from './detectors/missingValues.js';

const config = countryConfigSchema.parse(countryJson);
const detectors = [runDuplicateDonors, runFacilityNames, runSensorGlitches, runLoggerGaps, runMissingValues];

function toTaskRow(finding: Finding) {
  return {
    type: finding.type,
    record_ids: JSON.stringify(finding.recordIds),
    suggestion: JSON.stringify(finding.suggestion),
    reason: finding.reason,
    confidence: finding.confidence,
    source: finding.source,
  };
}

async function main(): Promise<void> {
  for (const detector of detectors) {
    const findings = await detector(pool, config);
    for (const finding of findings) {
      // TODO: make task creation idempotent for the same open task and record IDs.
      await pool.query(
        'insert into public.tasks (type, record_ids, suggestion, reason, confidence, source) values ($1, $2::jsonb, $3::jsonb, $4, $5, $6)',
        Object.values(toTaskRow(finding)),
      );
    }
  }
  await pool.end();
}

void main();
