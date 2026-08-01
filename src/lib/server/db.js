import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

export function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'zomswi_salt_2026', 1000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  const newHash = hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(newHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

const databaseUrl = process.env.DATABASE_URL;

let isPg = false;
let pgPool = null;
let sqliteDb = null;

if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
  isPg = true;
  pgPool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
}

export async function initDb() {
  if (isPg) {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS zones (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS restaurants (
          id SERIAL PRIMARY KEY,
          zone_id INTEGER REFERENCES zones(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          platform VARCHAR(50) DEFAULT 'Both',
          distance VARCHAR(50) DEFAULT '2-3 km',
          address TEXT,
          swiggy_url TEXT,
          zomato_url TEXT,
          is_seeded BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN DEFAULT false;

        CREATE TABLE IF NOT EXISTS order_receiver (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          phone VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS time_slots (
          id SERIAL PRIMARY KEY,
          slot_name VARCHAR(100) NOT NULL UNIQUE,
          start_time VARCHAR(20) NOT NULL,
          end_time VARCHAR(20) NOT NULL,
          icon VARCHAR(50) DEFAULT 'fa-clock',
          color_theme VARCHAR(50) DEFAULT '#3b82f6',
          display_order INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
          month_year VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'Pending',
          platform_used VARCHAR(50),
          time_slot VARCHAR(100),
          notes TEXT,
          receiver_id INTEGER REFERENCES order_receiver(id) ON DELETE SET NULL,
          receiver_name VARCHAR(255),
          receiver_address TEXT,
          receiver_phone VARCHAR(50),
          ordered_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(restaurant_id, month_year)
        );

        ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_id INTEGER;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_address TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(50);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS time_slot VARCHAR(100);
        ALTER TABLE orders ALTER COLUMN month_year TYPE VARCHAR(50);

        CREATE TABLE IF NOT EXISTS order_history (
          id SERIAL PRIMARY KEY,
          order_id INTEGER,
          restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
          restaurant_name VARCHAR(255),
          zone_name VARCHAR(255),
          month_year VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          platform_used VARCHAR(50),
          time_slot VARCHAR(100),
          receiver_id INTEGER,
          receiver_name VARCHAR(255),
          receiver_address TEXT,
          receiver_phone VARCHAR(50),
          notes TEXT,
          ordered_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_restaurants_zone ON restaurants(zone_id);
        CREATE INDEX IF NOT EXISTS idx_orders_rest_month ON orders(restaurant_id, month_year);
        CREATE INDEX IF NOT EXISTS idx_order_history_month ON order_history(month_year);
      `);

      // Auto-seed admin user (mijanur@gmail.com / Mijanur@9735)
      const userCheck = await client.query('SELECT * FROM users WHERE email = $1', ['mijanur@gmail.com']);
      if (userCheck.rows.length === 0) {
        const hash = hashPassword('Mijanur@9735');
        await client.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)', ['mijanur@gmail.com', hash, 'admin']);
        console.log('👤 Admin user seeded: mijanur@gmail.com');
      }

      // Auto-seed default 5 time slots if empty
      const slotsCheck = await client.query('SELECT COUNT(*) FROM time_slots');
      if (parseInt(slotsCheck.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO time_slots (slot_name, start_time, end_time, icon, color_theme, display_order)
          VALUES 
            ('Breakfast', '07:00 AM', '11:00 AM', 'fa-sun', '#f59e0b', 1),
            ('Lunch', '11:00 AM', '04:00 PM', 'fa-utensils', '#10b981', 2),
            ('Snacks', '04:00 PM', '07:00 PM', 'fa-mug-hot', '#3b82f6', 3),
            ('Dinner', '07:00 PM', '11:00 PM', 'fa-moon', '#8b5cf6', 4),
            ('Late Night Dinner', '11:00 PM', '06:00 AM', 'fa-star-and-crescent', '#ec4899', 5)
        `);
      }
    } finally {
      client.release();
    }
  } else {
    if (!sqliteDb) {
      sqliteDb = await open({
        filename: path.join(process.cwd(), 'data.db'),
        driver: sqlite3.Database
      });
    }

    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id INTEGER,
        name TEXT NOT NULL,
        platform TEXT DEFAULT 'Both',
        distance TEXT DEFAULT '2-3 km',
        address TEXT,
        swiggy_url TEXT,
        zomato_url TEXT,
        is_seeded INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS order_receiver (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS time_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_name TEXT NOT NULL UNIQUE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        icon TEXT DEFAULT 'fa-clock',
        color_theme TEXT DEFAULT '#3b82f6',
        display_order INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER,
        month_year TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        platform_used TEXT,
        time_slot TEXT,
        notes TEXT,
        receiver_id INTEGER,
        receiver_name TEXT,
        receiver_address TEXT,
        receiver_phone TEXT,
        ordered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, month_year),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_restaurants_zone ON restaurants(zone_id);
      CREATE INDEX IF NOT EXISTS idx_orders_rest_month ON orders(restaurant_id, month_year);
    `);

    try {
      await sqliteDb.exec(`ALTER TABLE restaurants ADD COLUMN is_seeded INTEGER DEFAULT 0;`);
    } catch (e) {}
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN receiver_id INTEGER;`);
    } catch (e) {}
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN receiver_name TEXT;`);
    } catch (e) {}
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN receiver_address TEXT;`);
    } catch (e) {}
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN receiver_phone TEXT;`);
    } catch (e) {}
    try {
      await sqliteDb.exec(`ALTER TABLE orders ADD COLUMN time_slot TEXT;`);
    } catch (e) {}

    // Auto-seed default 5 time slots in SQLite
    const slotsCount = await sqliteDb.get('SELECT COUNT(*) as count FROM time_slots');
    if (slotsCount && slotsCount.count === 0) {
      await sqliteDb.exec(`
        INSERT INTO time_slots (slot_name, start_time, end_time, icon, color_theme, display_order)
        VALUES 
          ('Breakfast', '07:00 AM', '11:00 AM', 'fa-sun', '#f59e0b', 1),
          ('Lunch', '11:00 AM', '04:00 PM', 'fa-utensils', '#10b981', 2),
          ('Snacks', '04:00 PM', '07:00 PM', 'fa-mug-hot', '#3b82f6', 3),
          ('Dinner', '07:00 PM', '11:00 PM', 'fa-moon', '#8b5cf6', 4),
          ('Late Night Dinner', '11:00 PM', '06:00 AM', 'fa-star-and-crescent', '#ec4899', 5)
      `);
    }
  }
}

export async function query(sql, params = []) {
  await initDb();
  if (isPg) {
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }

    const result = await pgPool.query(pgSql, params);
    return result.rows;
  } else {
    let sqliteSql = sql.replace(/\$\d+/g, '?');
    const trimmed = sqliteSql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      return await sqliteDb.all(sqliteSql, params);
    } else if (trimmed.startsWith('INSERT')) {
      const res = await sqliteDb.run(sqliteSql, params);
      return [{ id: res.lastID }];
    } else {
      const res = await sqliteDb.run(sqliteSql, params);
      return [{ changes: res.changes }];
    }
  }
}
