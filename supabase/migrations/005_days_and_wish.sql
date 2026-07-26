-- Switch tenure copy from "years" to "days" and add a personalized wish
-- message per employee (each employee now has their own câu chúc).

ALTER TABLE employees RENAME COLUMN years TO days;
ALTER TABLE live_state RENAME COLUMN years TO days;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS wish TEXT NOT NULL DEFAULT
    'luôn vững bước, lan tỏa giá trị và cùng MB Life tiến bước rực rỡ, vạn dặm thăng hoa.';

ALTER TABLE live_state
  ADD COLUMN IF NOT EXISTS wish TEXT;
