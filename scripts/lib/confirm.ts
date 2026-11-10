import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export function resolveProjectRef(): string {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF.trim();
  }
  const dbUrl = process.env.DATABASE_URL ?? '';
  const urlMatch =
    /postgres(?:ql)?:\/\/[^:]+:[^@]+@db\.([a-z0-9_-]+)\.supabase\.co/i.exec(dbUrl) ||
    /postgres\.([a-z0-9_-]+):/i.exec(dbUrl);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }
  const supaUrl = process.env.SUPABASE_URL ?? '';
  const supaMatch = /https:\/\/([a-z0-9_-]+)\.supabase\.co/i.exec(supaUrl);
  if (supaMatch?.[1]) {
    return supaMatch[1];
  }
  return 'data-quality-workbench';
}

export async function requestConfirmation(
  expectedRef: string,
  argv: readonly string[] = process.argv,
): Promise<boolean> {
  if (argv.includes('--yes') || argv.includes('-y')) {
    return true;
  }
  if (!process.stdin.isTTY) {
    console.error('Non-interactive environment detected without --yes flag. Aborting.');
    return false;
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Database is shared. To proceed with truncation, type the project ref "${expectedRef}": `,
    );
    return answer.trim() === expectedRef;
  } finally {
    rl.close();
  }
}

