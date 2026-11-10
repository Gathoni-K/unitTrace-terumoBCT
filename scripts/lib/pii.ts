/**
 * Pure utilities for PII masking and data minimisation.
 */

export function maskBirthDate(dateStr: string): string {
  const match = /^(\d{4})-\d{2}-\d{2}/.exec(dateStr);
  if (match) {
    return `${match[1]}-XX-XX`;
  }
  return dateStr.replace(/\b(\d{4})-\d{2}-\d{2}\b/g, '$1-XX-XX');
}

export function maskPhoneLast4(phoneLast4: string): string {
  void phoneLast4;
  return 'XXXX';
}

export function maskText(text: string): string {
  let masked = text.replace(/\b(\d{4})-\d{2}-\d{2}\b/g, '$1-XX-XX');
  // Match "phone last 4 digits (1234)" or "phone (1234)" -> "... (XXXX)"
  masked = masked.replace(/(phone(?:\s+last\s+4\s+digits)?\s*\()(\d{4})(\))/gi, '$1XXXX$3');
  return masked;
}

export function maskObjectPii<T>(input: T): T {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return maskBirthDate(input) as unknown as T;
    }
    return maskText(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskObjectPii(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'birth_date' || lowerKey === 'birthdate' || lowerKey === 'dob') {
        result[key] = typeof val === 'string' ? maskBirthDate(val) : val;
      } else if (lowerKey === 'phone_last4' || lowerKey === 'phonelast4') {
        result[key] = typeof val === 'string' ? maskPhoneLast4(val) : val;
      } else if (lowerKey === 'phone' || lowerKey === 'phone_number') {
        result[key] = typeof val === 'string' ? `+254XXXXX${val.slice(-4)}` : val;
      } else {
        result[key] = maskObjectPii(val);
      }
    }
    return result as unknown as T;
  }

  return input;
}

export interface MaskableTask {
  reason: string;
  suggestion: unknown;
}

export function maskTaskPii<T extends MaskableTask>(task: T): T {
  return Object.assign({}, task, {
    reason: maskText(task.reason),
    suggestion: maskObjectPii(task.suggestion),
  }) as T;
}

