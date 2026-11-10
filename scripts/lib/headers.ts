export interface HeaderValidationResult {
  valid: boolean;
  missingColumns: string[];
  unexpectedColumns: string[];
  errorMessage?: string;
}

export function validateCsvHeaders(
  actualHeaders: readonly string[],
  requiredColumns: readonly string[],
  tableName?: string,
): HeaderValidationResult {
  const actualSet = new Set(actualHeaders);
  const requiredSet = new Set(requiredColumns);

  const missingColumns = requiredColumns.filter((col) => !actualSet.has(col));
  const unexpectedColumns = actualHeaders.filter((col) => !requiredSet.has(col));

  const valid = missingColumns.length === 0;
  let errorMessage: string | undefined;

  if (!valid) {
    const prefix = tableName ? `Table "${tableName}"` : 'CSV';
    errorMessage = `${prefix} is missing required column(s): [${missingColumns.join(', ')}]. Unexpected column(s) present: [${unexpectedColumns.join(', ')}].`;
  }

  return {
    valid,
    missingColumns,
    unexpectedColumns,
    errorMessage,
  };
}

export function parseCsvHeaderLine(headerLine: string): string[] {
  return headerLine
    .split(',')
    .map((col) => col.trim().replace(/^"|"$/g, ''))
    .filter((col) => col.length > 0);
}

