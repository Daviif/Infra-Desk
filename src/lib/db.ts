import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "infra-desk.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT,
    contact TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial TEXT,
    ip_address TEXT,
    mac_address TEXT,
    user_account TEXT,
    responsible TEXT,
    status TEXT DEFAULT 'ativo',
    location TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(equipment_id, config_type, config_key)
  );

  CREATE TABLE IF NOT EXISTS equipment_drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    driver_version TEXT,
    driver_url TEXT,
    notes TEXT,
    installed_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    date TEXT NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    time_spent TEXT,
    technician TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate equipment table: add columns added after initial schema
const equipmentColumns = (db.pragma("table_info(equipment)") as Array<{ name: string }>).map(c => c.name);
const equipmentMigrations: [string, string][] = [
  ["ip_address", "TEXT"],
  ["mac_address", "TEXT"],
  ["user_account", "TEXT"],
  ["responsible", "TEXT"],
  ["status", "TEXT DEFAULT 'ativo'"],
  ["location", "TEXT"],
  ["updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"],
  ["remote_access", "TEXT"],
  ["remote_access_password", "TEXT"],
];
for (const [col, def] of equipmentMigrations) {
  if (!equipmentColumns.includes(col)) {
    db.exec(`ALTER TABLE equipment ADD COLUMN ${col} ${def}`);
  }
}

// Migrate tickets table
const ticketColumns = (db.pragma("table_info(tickets)") as Array<{ name: string }>).map(c => c.name);
if (!ticketColumns.includes("equipment_id")) {
  db.exec("ALTER TABLE tickets ADD COLUMN equipment_id INTEGER REFERENCES equipment(id)");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_client ON equipment(client_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);
  CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
  CREATE INDEX IF NOT EXISTS idx_equipment_configs ON equipment_configs(equipment_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_drivers ON equipment_drivers(equipment_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
  CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date);
`);

export default db;
