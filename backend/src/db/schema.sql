-- Scheduling platform schema (MySQL 8+)

CREATE DATABASE IF NOT EXISTS scheduling;
USE scheduling;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS event_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INT UNSIGNED NOT NULL COMMENT 'Duration in minutes',
  slug VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_types_slug (slug)
);

CREATE TABLE IF NOT EXISTS availability (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '0=Sunday .. 6=Saturday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  event_type_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_availability_event_day (event_type_id, day_of_week),
  CONSTRAINT fk_availability_event_type
    FOREIGN KEY (event_type_id) REFERENCES event_types (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  event_type_id INT UNSIGNED NOT NULL,
  status ENUM('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_event_date_status (event_type_id, date, status),
  CONSTRAINT fk_bookings_event_type
    FOREIGN KEY (event_type_id) REFERENCES event_types (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
