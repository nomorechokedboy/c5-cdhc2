-- Custom SQL migration file, put your code below! --
INSERT INTO units (alias, level, name, parentId)
VALUES 
('d1', 0, 'Tiểu đoàn 1', NULL),
('d2', 0, 'Tiểu đoàn 2', NULL),
('c1', 1, 'Đại đội 1', 1),
('c2', 1, 'Đại đội 2', 1),
('c3', 1, 'Đại đội 3', 1),
('c4', 1, 'Đại đội 4', 2),
('c5', 1, 'Đại đội 5', 2);