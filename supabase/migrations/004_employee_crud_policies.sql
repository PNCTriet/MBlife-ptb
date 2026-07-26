-- Public demo CRUD policies for /admin/employees.
-- WARNING: Anyone with the public anon key can modify employee data.

DROP POLICY IF EXISTS "employees_insert" ON employees;
CREATE POLICY "employees_insert" ON employees
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    code <> ''
    AND name <> ''
    AND years >= 0
    AND title IN ('Anh', 'Chị')
  );

DROP POLICY IF EXISTS "employees_update" ON employees;
CREATE POLICY "employees_update" ON employees
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    code <> ''
    AND name <> ''
    AND years >= 0
    AND title IN ('Anh', 'Chị')
  );

DROP POLICY IF EXISTS "employees_delete" ON employees;
CREATE POLICY "employees_delete" ON employees
  FOR DELETE TO anon, authenticated
  USING (true);
