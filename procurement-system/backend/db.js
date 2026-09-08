import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'procurement.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS farmers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  village TEXT,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS centres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  capacity_per_slot INTEGER NOT NULL DEFAULT 12,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  centre_id INTEGER NOT NULL REFERENCES centres(id),
  crop_type TEXT NOT NULL,
  crop_qty REAL NOT NULL,
  crop_grade TEXT NOT NULL,
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Appointment Booked',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id),
  status TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS procurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id),
  qty REAL NOT NULL,
  price REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appt_centre_date ON appointments(centre_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appt_farmer ON appointments(farmer_id);
`);

// Seed demo centres on first run only.
const centreCount = db.prepare('SELECT COUNT(*) as c FROM centres').get().c;
if (centreCount === 0) {
  const insert = db.prepare(`INSERT INTO centres (code, name, location, password_hash, capacity_per_slot, created_at) VALUES (?,?,?,?,?,?)`);
  const seed = [
    ['RVP', 'Ravulapalli Mandi Centre', 'Ravulapalli, Telangana', '1111', 12],
    ['KDP', 'Kondapur Procurement Yard', 'Kondapur, Telangana', '2222', 15],
    ['SBD', 'Shamshabad Grain Depot', 'Shamshabad, Telangana', '3333', 10],
  ];
  const now = Date.now();
  for (const [code, name, location, pin, cap] of seed) {
    insert.run(code, name, location, bcrypt.hashSync(pin, 8), cap, now);
  }
  console.log('Seeded demo centres. Login codes: RVP/1111, KDP/2222, SBD/3333 (change in production).');
}

export default db;
