-- Expand honorifics: Anh | Chị | Mr | Ms
-- VI copy for Anh/Chị, EN copy for Mr/Ms on the LED display.

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_title_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_title_check
  CHECK (title IN ('Anh', 'Chị', 'Mr', 'Ms'));

ALTER TABLE live_state DROP CONSTRAINT IF EXISTS live_state_title_check;
ALTER TABLE live_state
  ADD CONSTRAINT live_state_title_check
  CHECK (title IS NULL OR title IN ('Anh', 'Chị', 'Mr', 'Ms'));

-- Refresh CRUD policies so Mr/Ms can be inserted/updated.
DROP POLICY IF EXISTS "employees_insert" ON employees;
CREATE POLICY "employees_insert" ON employees
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    code <> ''
    AND name <> ''
    AND days >= 0
    AND title IN ('Anh', 'Chị', 'Mr', 'Ms')
  );

DROP POLICY IF EXISTS "employees_update" ON employees;
CREATE POLICY "employees_update" ON employees
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    code <> ''
    AND name <> ''
    AND days >= 0
    AND title IN ('Anh', 'Chị', 'Mr', 'Ms')
  );
