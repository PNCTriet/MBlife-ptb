-- Employee code for iPad lookup (e.g. 001, 002)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS code TEXT;

UPDATE employees SET code = LPAD(id::text, 3, '0') WHERE code IS NULL;

-- Prefer setting codes explicitly in seed.sql after this migration
ALTER TABLE employees
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_code_key ON employees (code);
