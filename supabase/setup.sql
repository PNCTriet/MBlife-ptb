-- =============================================================================
-- MB Life Demo — setup đầy đủ cho Supabase
-- Chạy 1 lần trong: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- 1) Bảng employees (danh sách nhân viên)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  days INTEGER NOT NULL CHECK (days >= 0),
  title TEXT NOT NULL CHECK (title IN ('Anh', 'Chị', 'Mr', 'Ms')),
  wish TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Bảng live_state (singleton — sync realtime iPad → LED)
CREATE TABLE IF NOT EXISTS live_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT,
  days INTEGER,
  title TEXT CHECK (title IS NULL OR title IN ('Anh', 'Chị', 'Mr', 'Ms')),
  wish TEXT,
  triggered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO live_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3) Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select" ON employees;
CREATE POLICY "employees_select" ON employees
  FOR SELECT TO anon, authenticated
  USING (true);

-- Public demo CRUD permissions for /admin/employees.
-- WARNING: switch to authenticated/service-role access before production.
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

DROP POLICY IF EXISTS "employees_delete" ON employees;
CREATE POLICY "employees_delete" ON employees
  FOR DELETE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "live_state_select" ON live_state;
CREATE POLICY "live_state_select" ON live_state
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "live_state_update" ON live_state;
CREATE POLICY "live_state_update" ON live_state
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (id = 1);

-- 4) Bật Realtime cho live_state (LED nhận cập nhật tức thì)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_state;
  END IF;
END $$;

-- 5) Seed dữ liệu demo
-- code = mã số nhân viên nhập trên iPad
-- title = 'Anh' | 'Chị' (VI) | 'Mr' | 'Ms' (EN)
-- wish = câu chúc / message riêng (VI hoặc EN theo danh xưng)
INSERT INTO employees (code, name, days, title, wish) VALUES
  ('001', 'Nguyễn Ngọc Hải Đông', 10, 'Anh', 'luôn vững bước, lan tỏa giá trị và cùng MB Life tiến bước rực rỡ, vạn dặm thăng hoa.'),
  ('002', 'Nguyễn Thùy Linh', 2, 'Chị', 'luôn giữ vững nhiệt huyết và tiếp tục tỏa sáng cùng MB Life.'),
  ('003', 'John Smith', 5, 'Mr', 'keep shining and keep moving forward with MB Life.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  days = EXCLUDED.days,
  title = EXCLUDED.title,
  wish = EXCLUDED.wish;

-- Thêm nhân viên mới (ví dụ):
-- INSERT INTO employees (code, name, days, title, wish) VALUES
--   ('003', 'Tên Nhân Viên', 5, 'Chị', 'Câu chúc riêng cho người này.')
-- ON CONFLICT (code) DO UPDATE SET
--   name = EXCLUDED.name,
--   days = EXCLUDED.days,
--   title = EXCLUDED.title,
--   wish = EXCLUDED.wish;
