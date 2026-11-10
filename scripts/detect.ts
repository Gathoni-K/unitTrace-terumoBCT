import { countryConfigSchema, type Finding } from '@workbench/shared';
import countryJson from '../config/country.kenya.json';
import { pool } from './lib/db.js';
import { run as runSensorGlitches } from './detectors/sensorGlitches.js';
import { run as runDuplicateDonors } from './detectors/duplicateDonors.js';
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
  console.log('Skipping facilityNames: not implemented');
  console.log('Skipping loggerGaps: not implemented');
  console.log('Skipping missingValues: not implemented');

  console.log('Running sensorGlitches detector...');
  const glitchFindings: Finding[] = await runSensorGlitches(pool, config);
  console.log(`Sensor glitches produced ${glitchFindings.length} findings.`);

  console.log('Running duplicateDonors detector...');
  const donorFindings: Finding[] = await runDuplicateDonors(pool, config);
  console.log(`Duplicate donors produced ${donorFindings.length} findings.`);

  const allFindings = [...glitchFindings, ...donorFindings];
  const taskRows = allFindings.map(toTaskRow);
  const { created, alreadyExisted } = await insertTaskRows(taskRows);

  console.log(`\nDetection summary:`);
  console.log(`  Total findings: ${allFindings.length}`);
  console.log(`  Tasks created: ${created}`);
  console.log(`  Tasks already existed: ${alreadyExisted}`);

  await pool.end();
}

void main();
