-- Add Anh/Chị title for display copy
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS title TEXT CHECK (title IN ('Anh', 'Chị'));

ALTER TABLE live_state
  ADD COLUMN IF NOT EXISTS title TEXT CHECK (title IS NULL OR title IN ('Anh', 'Chị'));

UPDATE employees SET title = 'Chị' WHERE title IS NULL;

ALTER TABLE employees
  ALTER COLUMN title SET NOT NULL;
