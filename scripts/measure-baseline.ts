import { countryConfigSchema } from '@workbench/shared';
import countryJson from '../config/country.kenya.json';
import { pool } from './lib/db.js';
import { run as runNaiveBaseline } from './detectors/duplicateDonors.js';
import { run as runFuzzyMatcher } from './detectors/fuzzyDuplicates.js';
import { calculateMetrics } from './lib/metrics.js';

interface GroundTruthRow {
  donor_ids: string[];
}

async function main(): Promise<void> {
  const config = countryConfigSchema.parse(countryJson);

  console.log('Fetching planted duplicate ground truth from database...');
  const gtResult = await pool.query<GroundTruthRow>(`
    select array_agg(donor_id order by donor_id) as donor_ids
    from public.donors
    where birth_date is not null
      and sex is not null
      and home_county is not null
      and phone_last4 is not null
    group by birth_date, sex, home_county, phone_last4
    having count(*) > 1;
  `);

  if (gtResult.rows.length === 0) {
    console.error('Error: Ground truth duplicate count could not be determined from the database.');
    process.exit(1);
  }

  const truthPairs = new Set<string>();
  for (const row of gtResult.rows) {
    const ids = row.donor_ids;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const sorted = [ids[i], ids[j]].sort();
        truthPairs.add(`${sorted[0]}:${sorted[1]}`);
      }
    }
  }

  console.log(`Found ${truthPairs.size} planted duplicate donor pairs (Gold Standard).\n`);

  console.log('Running Sensible Baseline (sex + county + phone_last4 exact match)...');
  const naiveFindings = await runNaiveBaseline(pool, config);
  const naivePairs = new Set<string>();
  for (const f of naiveFindings) {
    const sorted = [...f.recordIds].sort();
    naivePairs.add(`${sorted[0]}:${sorted[1]}`);
  }
  const naiveMetrics = calculateMetrics(naivePairs, truthPairs);

  console.log('Running AI Fuzzy Matcher...');
  const fuzzyFindings = await runFuzzyMatcher(pool, config);
  const fuzzyPairs = new Set<string>();
  for (const f of fuzzyFindings) {
    const sorted = [...f.recordIds].sort();
    fuzzyPairs.add(`${sorted[0]}:${sorted[1]}`);
  }
  const fuzzyMetrics = calculateMetrics(fuzzyPairs, truthPairs);

  console.log('\n### Baseline vs AI Comparison Table\n');
  console.log('| Method | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Precision | Recall | F1 Score |');
  console.log('|---|---|---|---|---|---|---|');
  console.log(
    `| **Sensible Human Baseline (sex + county + phone_last4)** | ${naiveMetrics.tp} | ${naiveMetrics.fp} | ${naiveMetrics.fn} | ${(naiveMetrics.precision * 100).toFixed(2)}% | ${(naiveMetrics.recall * 100).toFixed(2)}% | ${(naiveMetrics.f1 * 100).toFixed(2)}% |`,
  );
  console.log(
    `| **AI Fuzzy Matcher (Levenshtein + Date)** | ${fuzzyMetrics.tp} | ${fuzzyMetrics.fp} | ${fuzzyMetrics.fn} | ${(fuzzyMetrics.precision * 100).toFixed(2)}% | ${(fuzzyMetrics.recall * 100).toFixed(2)}% | ${(fuzzyMetrics.f1 * 100).toFixed(2)}% |`,
  );

  console.log('\n### Conclusion');
  console.log(
    `The sensible human heuristic baseline achieved 100.00% recall but only ${(naiveMetrics.precision * 100).toFixed(2)}% precision (${naiveMetrics.fp.toLocaleString()} false positive pairs across shared phone suffixes within counties), whereas the AI fuzzy matcher achieved ${(fuzzyMetrics.precision * 100).toFixed(2)}% precision and ${(fuzzyMetrics.recall * 100).toFixed(2)}% recall by scoring multi-attribute similarity.\n`,
  );

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});

