import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

// ---------- Password hashing ----------
// New format: pbkdf2_sha512$<iterations>$<saltHex>$<hashHex> (per-user random salt).
// Legacy format: bare hex hash using the global AUTH_SALT with 1000 iterations (still verified, rehashed on login).
const PBKDF2_ITERATIONS = 210000;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  return `pbkdf2_sha512$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

function legacyHash(password) {
  const salt = process.env.AUTH_SALT;
  if (!salt) return null;
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function safeHexEqual(a, b) {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    return bufA.length === bufB.length && bufA.length > 0 && crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

export function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  if (hash.startsWith('pbkdf2_sha512$')) {
    const [, iterStr, salt, expected] = hash.split('$');
    const iterations = parseInt(iterStr, 10);
    if (!iterations || !salt || !expected) return false;
    const actual = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return safeHexEqual(actual, expected);
  }
  const actual = legacyHash(password);
  return actual ? safeHexEqual(actual, hash) : false;
}

export function passwordNeedsRehash(hash) {
  return !hash || !hash.startsWith(`pbkdf2_sha512$${PBKDF2_ITERATIONS}$`);
}

// ---------- Sessions ----------
export const SESSION_COOKIE = 'zomswi_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days (sliding)

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.AUTH_SALT) {
    // Derive a separate key so the password salt is never used directly as the signing key
    return crypto.createHmac('sha256', process.env.AUTH_SALT).update('zomswi-session-key').digest('hex');
  }
  throw new Error('SESSION_SECRET (or AUTH_SALT) must be set in the environment');
}

export function createSignedSession(user) {
  const now = Date.now();
  const payloadStr = JSON.stringify({
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000
  });
  const b64Payload = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(b64Payload).digest('hex');
  return `${b64Payload}.${signature}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [b64Payload, signature] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(b64Payload).digest('hex');
    if (!safeHexEqual(signature, expectedSig)) return null;
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf-8'));
    if (!payload || !payload.email || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

export function isAdminRequest(cookies) {
  return Boolean(verifySession(cookies.get(SESSION_COOKIE)));
}

// ---------- Kolkata (IST) date helpers ----------
function kolkataParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function getKolkataMonthYear(date = new Date()) {
  const { year, month } = kolkataParts(date);
  return `${year}-${month}`;
}

export function getKolkataDateString(date = new Date()) {
  const { year, month, day } = kolkataParts(date);
  return `${year}-${month}-${day}`;
}

// ---------- Error helper ----------
export function serverError(err, context = 'Request failed') {
  console.error(`${context}:`, err);
  return new Response(JSON.stringify({ success: false, error: 'Something went wrong. Please try again.' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.VERCEL) {
  throw new Error('DATABASE_URL is required on Vercel: the local SQLite fallback cannot write to a read-only serverless filesystem.');
}

let isPg = false;
let pgPool = null;
let sqliteDb = null;

if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
  isPg = true;
  pgPool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 5000
  });
  
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle pg client:', err);
  });
}

// In-Memory Micro-Cache for Instant Sub-10ms Response Times
const cacheMap = new Map();

export function getCachedData(key) {
  const item = cacheMap.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cacheMap.delete(key);
    return null;
  }
  return item.data;
}

// On serverless (Vercel) each instance has its own cache and invalidation only reaches the local
// instance, so keep entries short-lived there to bound cross-instance staleness.
const MAX_CACHE_TTL_MS = process.env.VERCEL ? 3000 : Infinity;

export function setCachedData(key, data, ttlMs = 15000) {
  cacheMap.set(key, { data, expiry: Date.now() + Math.min(ttlMs, MAX_CACHE_TTL_MS) });
}

export function invalidateCache(pattern) {
  if (!pattern) {
    cacheMap.clear();
    return;
  }
  for (const k of cacheMap.keys()) {
    if (k.includes(pattern)) {
      cacheMap.delete(k);
    }
  }
}

let dbInitialized = false;
let dbInitPromise = null;

async function executeDbInit() {
  if (isPg) {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS zones (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          is_visible BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE zones ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

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
          ordered_at TIMESTAMPTZ,
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
          restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
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
          ordered_at TIMESTAMPTZ,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS app_meta (
          id SERIAL PRIMARY KEY,
          meta_key VARCHAR(100) NOT NULL UNIQUE,
          meta_value TEXT
        );

        CREATE TABLE IF NOT EXISTS login_attempts (
          id SERIAL PRIMARY KEY,
          attempt_key VARCHAR(400) NOT NULL UNIQUE,
          fail_count INTEGER NOT NULL DEFAULT 0,
          first_failed_at BIGINT NOT NULL
        );

        INSERT INTO app_meta (meta_key, meta_value) VALUES ('data_version', '0') ON CONFLICT (meta_key) DO NOTHING;

        CREATE INDEX IF NOT EXISTS idx_restaurants_zone ON restaurants(zone_id);
        CREATE INDEX IF NOT EXISTS idx_restaurants_zone_dist ON restaurants(zone_id, distance);
        CREATE INDEX IF NOT EXISTS idx_restaurants_platform ON restaurants(platform);
        CREATE INDEX IF NOT EXISTS idx_orders_rest_month ON orders(restaurant_id, month_year);
        CREATE INDEX IF NOT EXISTS idx_orders_month_status ON orders(month_year, status);
        CREATE INDEX IF NOT EXISTS idx_orders_receiver ON orders(receiver_id);
        CREATE INDEX IF NOT EXISTS idx_order_history_month ON order_history(month_year);
        CREATE INDEX IF NOT EXISTS idx_order_history_rest_month ON order_history(restaurant_id, month_year);
        CREATE INDEX IF NOT EXISTS idx_order_history_receiver ON order_history(receiver_id);

        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at BIGINT;

        -- Deleting a restaurant must keep its order history (restaurant_name / zone_name are stored
        -- on each row), so migrate the old ON DELETE CASCADE foreign key to SET NULL once.
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'order_history_restaurant_id_fkey' AND confdeltype = 'c'
          ) THEN
            ALTER TABLE order_history DROP CONSTRAINT order_history_restaurant_id_fkey;
            ALTER TABLE order_history ADD CONSTRAINT order_history_restaurant_id_fkey
              FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);

      // Auto-seed admin user from environment variables (ADMIN_EMAIL & ADMIN_PASSWORD)
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        // Only bootstrap the first admin; later admins are managed from the Account tab, so a removed
        // env admin must not come back on the next cold start
        const userCheck = await client.query('SELECT id FROM users LIMIT 1');
        if (userCheck.rows.length === 0) {
          const hash = hashPassword(adminPassword);
          await client.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)', [adminEmail, hash, 'admin']);
          console.log(`👤 Admin user seeded: ${adminEmail}`);
        }
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

      // Auto-seed default 21 Kolkata receivers if empty
      const recCheck = await client.query('SELECT COUNT(*) FROM order_receiver');
      if (parseInt(recCheck.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO order_receiver (name, address, phone)
          VALUES
            ('Syed- Jadavpur', 'House No. 6/33, Central Park East, Chittaranjan Colony, Baghajatin Colony, Kolkata, West Bengal, India', '+91-8637817268'),
            ('masu-aliah', 'Aliah University Girls Hostel , Kadampukur Village, Newtown, Kadampukur, Kolkata, West Bengal, India', '+91-9907702572'),
            ('Asish- Dummy dumdum', 'Dumdum , Rajbari, Dum Dum, Kolkata, West Bengal, India', '+91-6297319292'),
            ('Deep- Dumdum', 'MAA APARTMENT FLAT NO 4TH FLOOR, 4th Floor, Kamalapur, Kalidham, Rajbari, Dum Dum, Kolkata, West Bengal, India', '+91-7319824670'),
            ('Avijit - Belarani appartment - Jadavpur', 'Belarani Apartment Ground Floor, Bikramgarh,103/1, Nearest Khabo Cafe, Bikramgarh, Jadavpur, Kolkata, West Bengal', '+91-8116625487'),
            ('shubham - JU', '2/31, Viveknagar, Garfa, Kolkata, West Bengal, India', '+91-6296479067'),
            ('Tanmoy - Laketown', 'P-33,Block-B,Sitaram Nivas,Kolkata-89., Sreebhumi, Lake Town, South Dumdum', '+91-9874945699'),
            ('Nasim- Dumdum', '37/E, Atapara, Sinthee, Baranagar Kol 700050', '+91-9635109747'),
            ('sarik 8b Ju', 'Jadavpur 8b Busstand , 8B Bus Terminus Road, Jadavpur, Kolkata, West Bengal', '+91-6297319292'),
            ('Sarik', 'Aliah University Boys Hostel , Aliah University Campus, Action Area I,IIA/27,New Town, Kolkata, West Bengal', '+91-6297319292'),
            ('Behala - Dummy', 'Behala , 4, Brahmo Samaj Rd, Vidyasagar Park, Behala, Kolkata, West Bengal 700034, India', '+91-6297319292'),
            ('sarik - alipore zoo', 'Alipore Zoo , Alipur Zoological Garden, Alipore, Kolkata, West Bengal, India', '+91-6297319292'),
            ('Arif - Imtiaz frnd JU', 'Jadavpur Main Hostel, B Block , Room No 17 (3rd Floor), Beside Jadavpur Police Station , Jadavpur, Kolkata, West Bengal', '+91-8617615800'),
            ('Imtiaz -Jadavpur', 'Jadavpur University Main Hostel,B-Block,Room No-20, Jadavpur University, Kolkata, West Bengal', '+91-8927058793'),
            ('mirza au', 'Aliah University Boys Hostel , Aliah University Boys'' Hostel, Action Area II, New Town, Kolkata, West Bengal', '+91-8513092024'),
            ('Home', 'Centenary Building , RM-27, AJC Bose Rd, Sealdah, Raja Bazar, Kolkata, West Bengal', '+91-9907702572'),
            ('Santu - Jadavpur', 'C/56/2, Thikana,Ground Floor , Bapuji Nagar, Jadavpur, Kolkata, West Bengal, India', '+91-7719258174'),
            ('Rajib- Avijit frnd JU', '2/174, Bijoygarh, Jadavpur, Kolkata, West Bengal, India', '+91-8597017200'),
            ('Noor - South dumdum', '931, jaipur road Kolkata, 700074, Roy Mallick Colony, Bahiragath Colony, Jawpur, Kolkata, West Bengal', '+91-8609839425'),
            ('Akiz - Jadavpur', 'Jadavpur University Main Hostel A1 Block, Room No 30, 1st Floor, Jadavpur University, Kolkata, West Bengal', '+91-8001322566'),
            ('Laketown nursing home', 'Laketown Nursing Home , Lake Town Nursing Home, Block B, Sreebhumi, Lake Town, Kolkata, West Bengal', '+91-6297319292')
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
      await sqliteDb.exec('PRAGMA foreign_keys = ON;');
    }

    await sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_visible INTEGER DEFAULT 1,
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

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meta_key TEXT NOT NULL UNIQUE,
        meta_value TEXT
      );

      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_key TEXT NOT NULL UNIQUE,
        fail_count INTEGER NOT NULL DEFAULT 0,
        first_failed_at INTEGER NOT NULL
      );

      INSERT INTO app_meta (meta_key, meta_value) VALUES ('data_version', '0') ON CONFLICT (meta_key) DO NOTHING;

      CREATE TABLE IF NOT EXISTS order_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        restaurant_id INTEGER,
        restaurant_name TEXT,
        zone_name TEXT,
        month_year TEXT NOT NULL,
        status TEXT NOT NULL,
        platform_used TEXT,
        time_slot TEXT,
        receiver_id INTEGER,
        receiver_name TEXT,
        receiver_address TEXT,
        receiver_phone TEXT,
        notes TEXT,
        ordered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_restaurants_zone ON restaurants(zone_id);
      CREATE INDEX IF NOT EXISTS idx_restaurants_zone_dist ON restaurants(zone_id, distance);
      CREATE INDEX IF NOT EXISTS idx_restaurants_platform ON restaurants(platform);
      CREATE INDEX IF NOT EXISTS idx_orders_rest_month ON orders(restaurant_id, month_year);
      CREATE INDEX IF NOT EXISTS idx_orders_month_status ON orders(month_year, status);
      CREATE INDEX IF NOT EXISTS idx_orders_receiver ON orders(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_order_history_month ON order_history(month_year);
      CREATE INDEX IF NOT EXISTS idx_order_history_rest_month ON order_history(restaurant_id, month_year);
      CREATE INDEX IF NOT EXISTS idx_order_history_receiver ON order_history(receiver_id);
    `);

    try {
      await sqliteDb.exec(`ALTER TABLE zones ADD COLUMN is_visible INTEGER DEFAULT 1;`);
    } catch (e) {}
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
    try {
      await sqliteDb.exec(`ALTER TABLE users ADD COLUMN password_changed_at INTEGER;`);
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

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      // Only bootstrap the first admin (see the Postgres branch above)
      const userCheck = await sqliteDb.get('SELECT id FROM users LIMIT 1');
      if (!userCheck) {
        const hash = hashPassword(adminPassword);
        await sqliteDb.run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [adminEmail, hash, 'admin']);
        console.log(`👤 Admin user seeded in SQLite: ${adminEmail}`);
      }
    }
  }
  dbInitialized = true;
}

export async function initDb() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = executeDbInit();
  }
  return dbInitPromise;
}

export async function query(sql, params = []) {
  if (!dbInitialized) {
    await initDb();
  }
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

// Runs fn(tx) inside a single database transaction; tx(sql, params) has the same contract as query().
export async function transaction(fn) {
  if (!dbInitialized) {
    await initDb();
  }
  if (isPg) {
    const client = await pgPool.connect();
    const tx = async (sql, params = []) => {
      let paramIndex = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !/RETURNING/i.test(pgSql)) {
        pgSql += ' RETURNING id';
      }
      const result = await client.query(pgSql, params);
      return result.rows;
    };
    try {
      await client.query('BEGIN');
      const out = await fn(tx);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else {
    await sqliteDb.exec('BEGIN');
    try {
      const out = await fn(query);
      await sqliteDb.exec('COMMIT');
      return out;
    } catch (err) {
      await sqliteDb.exec('ROLLBACK').catch(() => {});
      throw err;
    }
  }
}

// ---------- Data version (cheap change detection for polling clients) ----------
export async function bumpDataVersion() {
  await query("UPDATE app_meta SET meta_value = ? WHERE meta_key = 'data_version'", [String(Date.now())]);
}

export async function getDataVersion() {
  const rows = await query("SELECT meta_value FROM app_meta WHERE meta_key = 'data_version'");
  return rows[0]?.meta_value || '0';
}

// ---------- Login attempt tracking (stored in the DB so all serverless instances share it) ----------
const MAX_FAILED_LOGINS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export async function isLoginLockedOut(key) {
  const rows = await query('SELECT fail_count, first_failed_at FROM login_attempts WHERE attempt_key = ?', [key]);
  if (rows.length === 0) return false;
  if (Date.now() - Number(rows[0].first_failed_at) > LOGIN_LOCKOUT_MS) return false;
  return Number(rows[0].fail_count) >= MAX_FAILED_LOGINS;
}

export async function recordLoginFailure(key) {
  const now = Date.now();
  const rows = await query('SELECT first_failed_at FROM login_attempts WHERE attempt_key = ?', [key]);
  if (rows.length === 0) {
    await query('INSERT INTO login_attempts (attempt_key, fail_count, first_failed_at) VALUES (?, 1, ?)', [key, now]);
  } else if (now - Number(rows[0].first_failed_at) > LOGIN_LOCKOUT_MS) {
    await query('UPDATE login_attempts SET fail_count = 1, first_failed_at = ? WHERE attempt_key = ?', [now, key]);
  } else {
    await query('UPDATE login_attempts SET fail_count = fail_count + 1 WHERE attempt_key = ?', [key]);
  }
}

export async function clearLoginFailures(key) {
  await query('DELETE FROM login_attempts WHERE attempt_key = ?', [key]);
}
