INSERT IGNORE INTO users (id, name) VALUES (1, 'Demo Admin');

INSERT INTO event_types (title, description, duration, slug) VALUES
(
  '30 Min Discovery Call',
  'Quick intro to discuss your goals and see if we are a fit.',
  30,
  'discovery-call'
),
(
  '60 Min Deep Dive',
  'Detailed session for architecture review and planning.',
  60,
  'deep-dive'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  duration = VALUES(duration);

-- Assumes event_types got ids 1 and 2 on fresh DB; seed script uses last IDs if needed from app — 
-- For raw SQL seed, fix ids after first insert:
SET @e1 = (SELECT id FROM event_types WHERE slug = 'discovery-call' LIMIT 1);
SET @e2 = (SELECT id FROM event_types WHERE slug = 'deep-dive' LIMIT 1);

DELETE FROM availability WHERE event_type_id IN (@e1, @e2);

-- Mon–Fri 9:00–17:00 America/New_York for both event types
INSERT INTO availability (day_of_week, start_time, end_time, timezone, event_type_id)
SELECT d.day, '09:00:00', '17:00:00', 'America/New_York', @e1
FROM (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) AS d;

INSERT INTO availability (day_of_week, start_time, end_time, timezone, event_type_id)
SELECT d.day, '09:00:00', '17:00:00', 'America/New_York', @e2
FROM (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) AS d;

DELETE FROM bookings WHERE event_type_id IN (@e1, @e2);

INSERT INTO bookings (name, email, date, start_time, end_time, event_type_id, status) VALUES
('Alice Example', 'alice@example.com', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00:00', '10:30:00', @e1, 'CONFIRMED'),
('Bob Sample', 'bob@example.com', DATE_ADD(CURDATE(), INTERVAL 5 DAY), '14:00:00', '15:00:00', @e2, 'CONFIRMED'),
('Past Booked', 'past@example.com', DATE_SUB(CURDATE(), INTERVAL 7 DAY), '11:00:00', '11:30:00', @e1, 'CONFIRMED');
