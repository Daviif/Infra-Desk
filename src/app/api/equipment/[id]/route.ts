import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const equipment = db
    .prepare(
      `SELECT e.*, c.name as client_name FROM equipment e 
       LEFT JOIN clients c ON e.client_id = c.id 
       WHERE e.id = ?`
    )
    .get(id);

  if (!equipment) {
    return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
  }

  const configs = db
    .prepare("SELECT * FROM equipment_configs WHERE equipment_id = ?")
    .all(id);

  const drivers = db
    .prepare("SELECT * FROM equipment_drivers WHERE equipment_id = ? ORDER BY installed_date DESC")
    .all(id);

  return NextResponse.json({ ...equipment, configs, drivers });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    type,
    brand,
    model,
    serial,
    ip_address,
    mac_address,
    user_account,
    responsible,
    status,
    location,
    remote_access,
    remote_access_password,
    notes,
    configs,
    drivers,
  } = body;

  if (!type) {
    return NextResponse.json({ error: "type é obrigatório" }, { status: 400 });
  }

  db.prepare(
    `UPDATE equipment SET
      type=?, brand=?, model=?, serial=?, ip_address=?, mac_address=?,
      user_account=?, responsible=?, status=?, location=?, remote_access=?, remote_access_password=?, notes=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).run(
    type,
    brand || null,
    model || null,
    serial || null,
    ip_address || null,
    mac_address || null,
    user_account || null,
    responsible || null,
    status || "ativo",
    location || null,
    remote_access || null,
    remote_access_password || null,
    notes || null,
    id
  );

  if (configs && Array.isArray(configs)) {
    db.prepare("DELETE FROM equipment_configs WHERE equipment_id = ?").run(id);
    const configStmt = db.prepare(
      `INSERT INTO equipment_configs (equipment_id, config_type, config_key, config_value)
       VALUES (?, ?, ?, ?)`
    );
    for (const config of configs) {
      configStmt.run(id, config.type, config.key, config.value);
    }
  }

  if (drivers && Array.isArray(drivers)) {
    const driverStmt = db.prepare(
      `INSERT OR REPLACE INTO equipment_drivers (id, equipment_id, driver_name, driver_version, driver_url, notes, installed_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    );
    for (const driver of drivers) {
      driverStmt.run(
        driver.id || null,
        id,
        driver.name,
        driver.version || null,
        driver.url || null,
        driver.notes || null,
        driver.installed_date || null
      );
    }
  }

  const equipment = db
    .prepare(
      `SELECT e.*, c.name as client_name FROM equipment e 
       LEFT JOIN clients c ON e.client_id = c.id 
       WHERE e.id = ?`
    )
    .get(id);

  const updatedConfigs = db
    .prepare("SELECT * FROM equipment_configs WHERE equipment_id = ?")
    .all(id);

  const updatedDrivers = db
    .prepare("SELECT * FROM equipment_drivers WHERE equipment_id = ? ORDER BY installed_date DESC")
    .all(id);

  const responseData = equipment
    ? { ...equipment, configs: updatedConfigs, drivers: updatedDrivers }
    : null;

  return NextResponse.json(responseData);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM equipment_drivers WHERE equipment_id = ?").run(id);
  db.prepare("DELETE FROM equipment_configs WHERE equipment_id = ?").run(id);
  db.prepare("DELETE FROM equipment WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
