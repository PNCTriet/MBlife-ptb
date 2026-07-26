-- Replace with your actual employee list before the event
-- code: mã NV | title: 'Anh'|'Chị' (VI) | 'Mr'|'Ms' (EN) | wish: câu chúc/message riêng
INSERT INTO employees (code, name, days, title, wish) VALUES
  ('001', 'Nguyễn Ngọc Hải Đông', 10, 'Anh', 'luôn vững bước, lan tỏa giá trị và cùng MB Life tiến bước rực rỡ, vạn dặm thăng hoa.'),
  ('002', 'Nguyễn Thùy Linh', 2, 'Chị', 'luôn giữ vững nhiệt huyết và tiếp tục tỏa sáng cùng MB Life.'),
  ('003', 'John Smith', 5, 'Mr', 'keep shining and keep moving forward with MB Life.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  days = EXCLUDED.days,
  title = EXCLUDED.title,
  wish = EXCLUDED.wish;
