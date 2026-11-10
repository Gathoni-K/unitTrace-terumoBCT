export type SmsCommandResult =
  | { taskId: number; action: 'accept' | 'reject' }
  | { error: string };

// TODO: keep this implementation in sync with packages/shared/src/index.ts.
export function parseSmsCommand(text: string, lockedFields: readonly string[] = []): SmsCommandResult {
  const normalized = text.trim();
  if (lockedFields.some((field) => normalized.toLowerCase().includes(field.toLowerCase()))) {
    return { error: 'This command mentions a locked field.' };
  }
  const match = /^(\d+)\s+(OK|NO)$/i.exec(normalized);
  if (!match) return { error: 'Expected a command such as "41 OK" or "41 NO".' };
  return { taskId: Number(match[1]), action: match[2].toUpperCase() === 'OK' ? 'accept' : 'reject' };
}
