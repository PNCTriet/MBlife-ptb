-- Employees: pre-loaded list (code + name + years + Anh/Chị)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  years INTEGER NOT NULL CHECK (years >= 0),
  title TEXT NOT NULL CHECK (title IN ('Anh', 'Chị')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton row synced in real-time between iPad input and LED display
CREATE TABLE IF NOT EXISTS live_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT,
  years INTEGER,
  title TEXT CHECK (title IS NULL OR title IN ('Anh', 'Chị')),
  triggered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO live_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select" ON employees
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "live_state_select" ON live_state
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "live_state_update" ON live_state
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (id = 1);

-- Enable Realtime for LED screen
ALTER PUBLICATION supabase_realtime ADD TABLE live_state;
