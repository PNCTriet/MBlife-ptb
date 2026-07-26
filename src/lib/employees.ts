import type { Employee } from "./types";

export function normalizeCode(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

/** Strip leading zeros for numeric codes so "1", "01", "001" → "1". */
export function normalizeEmployeeCode(code: string): string {
  const trimmed = normalizeCode(code);
  if (!trimmed) return trimmed;
  if (/^\d+$/.test(trimmed)) return String(BigInt(trimmed));
  return trimmed;
}

/** Same numeric identity for lookup ("000" and "0" share key "0"). */
export function numericCodeKey(code: string): string | null {
  if (!/^\d+$/.test(code)) return null;
  return String(BigInt(code));
}

export function findEmployeeByCode(
  employees: Employee[],
  query: string
): Employee | null {
  const normalized = normalizeEmployeeCode(query);
  if (!normalized) return null;

  const exact = employees.find((e) => e.code === normalized);
  if (exact) return exact;

  const queryKey = numericCodeKey(normalized);
  if (queryKey == null) return null;

  return (
    employees.find((e) => {
      const key = numericCodeKey(e.code);
      return key != null && key === queryKey;
    }) ?? null
  );
}

export function filterEmployeesByCode(
  employees: Employee[],
  query: string
): Employee[] {
  const normalized = normalizeCode(query);
  if (!normalized) return [];

  return employees
    .filter((e) => e.code.startsWith(normalized))
    .slice(0, 8);
}
