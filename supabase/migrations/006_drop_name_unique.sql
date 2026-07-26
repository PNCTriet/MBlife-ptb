-- Employee names are not unique in real data (many people share the same name).
-- Uniqueness is enforced on `code` only. Upsert-by-code was failing when a
-- different code reused an existing name because of employees_name_key.

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_name_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'employees_name_key'
  ) THEN
    DROP INDEX employees_name_key;
  END IF;
END $$;
