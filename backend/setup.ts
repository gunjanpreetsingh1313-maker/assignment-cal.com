import mysql from "mysql2/promise";
import dotenv from "dotenv";

async function test() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "process.env.DB_PASSWORD",
  });

  try {
    // Drop and recreate database
    await conn.query("DROP DATABASE IF EXISTS cal_clone");
    await conn.query("CREATE DATABASE cal_clone");
    console.log("Database created");

    // Use the database
    await conn.query("USE cal_clone");
    
    // Create the tables
    await conn.query(`
      CREATE TABLE users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        PRIMARY KEY (id)
      )
    `);
    console.log("Users table created");

    await conn.query(`
      CREATE TABLE event_types (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration INT UNSIGNED NOT NULL,
        slug VARCHAR(191) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_event_types_slug (slug)
      )
    `);
    console.log("Event types table created");

    await conn.query(`
      CREATE TABLE availability (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        day_of_week TINYINT UNSIGNED NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
        event_type_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        KEY idx_availability_event_day (event_type_id, day_of_week),
        CONSTRAINT fk_availability_event_type
          FOREIGN KEY (event_type_id) REFERENCES event_types (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log("Availability table created");

    await conn.query(`
      CREATE TABLE bookings (
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
      )
    `);
    console.log("Bookings table created");

    // Insert seed data
    await conn.query("INSERT IGNORE INTO users (id, name) VALUES (1, 'Demo Admin')");
    
    await conn.query(`
      INSERT IGNORE INTO event_types (title, description, duration, slug) VALUES
      ('30 Min Discovery Call', 'Quick intro to discuss your goals and see if we are a fit.', 30, 'discovery-call'),
      ('60 Min Deep Dive', 'Detailed session for architecture review and planning.', 60, 'deep-dive')
    `);
    console.log("Event types seeded");

    const [eventTypes] = await conn.query("SELECT id, slug FROM event_types");
    const e1 = eventTypes.find(e => e.slug === 'discovery-call')?.id;
    const e2 = eventTypes.find(e => e.slug === 'deep-dive')?.id;

    if (e1 && e2) {
      await conn.query(`
        INSERT IGNORE INTO availability (day_of_week, start_time, end_time, timezone, event_type_id)
        SELECT d.day, '09:00:00', '17:00:00', 'America/New_York', ?
        FROM (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) AS d
      `, [e1]);

      await conn.query(`
        INSERT IGNORE INTO availability (day_of_week, start_time, end_time, timezone, event_type_id)
        SELECT d.day, '09:00:00', '17:00:00', 'America/New_York', ?
        FROM (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) AS d
      `, [e2]);
      console.log("Availability seeded");

      await conn.query(`
        INSERT IGNORE INTO bookings (name, email, date, start_time, end_time, event_type_id, status) VALUES
        (?, ?, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00:00', '10:30:00', ?, 'CONFIRMED'),
        (?, ?, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '14:00:00', '15:00:00', ?, 'CONFIRMED'),
        (?, ?, DATE_SUB(CURDATE(), INTERVAL 7 DAY), '11:00:00', '11:30:00', ?, 'CONFIRMED')
      `, ['Alice Example', 'alice@example.com', e1, 'Bob Sample', 'bob@example.com', e2, 'Past Booked', 'past@example.com', e1]);
      console.log("Bookings seeded");
    }

    console.log("✅ Database setup complete!");
  } finally {
    await conn.end();
  }
}

test().catch(console.error);
