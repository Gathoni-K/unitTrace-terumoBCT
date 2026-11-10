import { countryConfigSchema, type Finding } from '@workbench/shared';
import countryJson from '../config/country.kenya.json';
import { pool } from './lib/db.js';
import { run as runSensorGlitches } from './detectors/sensorGlitches.js';
import { run as runMissingDonorBloodGroup } from './detectors/missingDonorBloodGroup.js';
import { run as runUnknownPatientBloodGroup } from './detectors/unknownPatientBloodGroup.js';
import { run as runUnconfirmedTransfers } from './detectors/unconfirmedTransfers.js';
import { run as runFuzzyDuplicates } from './detectors/fuzzyDuplicates.js';
import { run as runDuplicateDonors } from './detectors/duplicateDonors.js';
import { run as runDonationTooSoon } from './detectors/donationTooSoon.js';
import { run as runLoggerGaps } from './detectors/loggerGaps.js';
import { run as runInvalidIsbt128 } from './detectors/invalidIsbt128.js';
import { toTaskRow, type TaskRow } from './lib/taskRow.js';

const config = countryConfigSchema.parse(countryJson);

async function insertTaskRows(rows: TaskRow[]): Promise<{ created: number; alreadyExisted: number }> {
  if (rows.length === 0) {
    return { created: 0, alreadyExisted: 0 };
  }

  const batchSize = 100;
  let totalCreated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuePlaceholders: string[] = [];
    const params: (string | null)[] = [];

    batch.forEach((row, index) => {
      const offset = index * 7;
      valuePlaceholders.push(
        `($${offset + 1}, $${offset + 2}::jsonb, $${offset + 3}::jsonb, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`,
      );
      params.push(
        row.type,
        row.record_ids,
        row.suggestion,
        row.reason,
        row.confidence,
        row.source,
        row.dedupe_key,
      );
    });

    const query = `
      insert into public.tasks (type, record_ids, suggestion, reason, confidence, source, dedupe_key)
      values ${valuePlaceholders.join(', ')}
      on conflict (dedupe_key) do nothing;
    `;

    const res = await pool.query(query, params);
    totalCreated += res.rowCount ?? 0;
  }

  return {
    created: totalCreated,
    alreadyExisted: rows.length - totalCreated,
  };
}

async function main(): Promise<void> {
  console.log('Skipping facilityNames: not implemented (out of hackathon core defect scope)');

  const noAiFlag = process.argv.includes('--no-ai');
  const enableFuzzy = config.enable_fuzzy_matching ?? config.enableFuzzyMatching ?? true;
  const isFallback = noAiFlag || !enableFuzzy;

  if (isFallback) {
    console.log('⚠️ AI offline. Running rule-based detectors and naive baseline only.');
  }

  const detectors = [
    { name: 'sensorGlitches', fn: runSensorGlitches },
    { name: 'missingDonorBloodGroup', fn: runMissingDonorBloodGroup },
    { name: 'unknownPatientBloodGroup', fn: runUnknownPatientBloodGroup },
    { name: 'unconfirmedTransfers', fn: runUnconfirmedTransfers },
    isFallback
      ? { name: 'duplicateDonors (naive baseline)', fn: runDuplicateDonors }
      : { name: 'fuzzyDuplicates', fn: runFuzzyDuplicates },
    { name: 'donationTooSoon', fn: runDonationTooSoon },
    { name: 'loggerGaps', fn: runLoggerGaps },
    { name: 'invalidIsbt128', fn: runInvalidIsbt128 },
  ];

  const allFindings: Finding[] = [];

  for (const detector of detectors) {
    console.log(`Running detector ${detector.name}...`);
    const findings = await detector.fn(pool, config);
    console.log(`  -> ${detector.name} produced ${findings.length} findings.`);
    allFindings.push(...findings);
  }

  console.log(`\nPersisting ${allFindings.length} findings into public.tasks...`);
  const taskRows = allFindings.map(toTaskRow);
  const { created, alreadyExisted } = await insertTaskRows(taskRows);

  console.log(`\nDetection summary:`);
  console.log(`  Total findings generated: ${allFindings.length}`);
  console.log(`  New tasks created: ${created}`);
  console.log(`  Existing tasks skipped: ${alreadyExisted}`);

  await pool.end();
}

void main();
