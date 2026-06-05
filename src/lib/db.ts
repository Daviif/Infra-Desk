import { Pool } from "pg";

// max:3 evita estourar o limite de conexões em ambiente serverless (Vercel)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const initDb = pool.query(`
  CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    contact TEXT,
    notes TEXT,
    document_type TEXT,
    document TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
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
    remote_access TEXT,
    remote_access_password TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment_configs (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(equipment_id, config_type, config_key)
  );

  CREATE TABLE IF NOT EXISTS equipment_drivers (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    driver_version TEXT,
    driver_url TEXT,
    notes TEXT,
    installed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    equipment_id INTEGER REFERENCES equipment(id),
    date TEXT NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    time_spent TEXT,
    technician TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_client ON equipment(client_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);
  CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
  CREATE INDEX IF NOT EXISTS idx_equipment_configs ON equipment_configs(equipment_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_drivers ON equipment_drivers(equipment_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
  CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date);
`).catch((err) => console.error("DB init error:", err));

export { initDb };
export default pool;
