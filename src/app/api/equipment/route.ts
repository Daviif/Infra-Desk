import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const client_id = searchParams.get("client_id");

  const equipments = client_id
    ? db.prepare(
        `SELECT e.*, c.name as client_name FROM equipment e
         LEFT JOIN clients c ON e.client_id = c.id
         WHERE e.client_id = ? ORDER BY e.type, e.brand`
      ).all(client_id)
    : db.prepare(
        `SELECT e.*, c.name as client_name FROM equipment e
         LEFT JOIN clients c ON e.client_id = c.id
         ORDER BY e.created_at DESC`
      ).all();

  return NextResponse.json(equipments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    client_id,
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

  if (!client_id || !type) {
    return NextResponse.json(
      { error: "client_id e type são obrigatórios" },
      { status: 400 }
    );
  }

  const stmt = db.prepare(
    `INSERT INTO equipment (
      client_id, type, brand, model, serial, ip_address, mac_address,
      user_account, responsible, status, location, remote_access, remote_access_password, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  );

  const result = stmt.run(
    client_id,
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
    notes || null
  );

  const equipment = db
    .prepare(
      `SELECT e.*, c.name as client_name FROM equipment e 
       LEFT JOIN clients c ON e.client_id = c.id 
       WHERE e.id = ?`
    )
    .get(result.lastInsertRowid);

  if (configs && Array.isArray(configs)) {
    const configStmt = db.prepare(
      `INSERT INTO equipment_configs (equipment_id, config_type, config_key, config_value)
       VALUES (?, ?, ?, ?)`
    );
    for (const config of configs) {
      configStmt.run(result.lastInsertRowid, config.type, config.key, config.value);
    }
  }

  if (drivers && Array.isArray(drivers)) {
    const driverStmt = db.prepare(
      `INSERT INTO equipment_drivers (equipment_id, driver_name, driver_version, driver_url, notes, installed_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const driver of drivers) {
      driverStmt.run(
        result.lastInsertRowid,
        driver.name,
        driver.version || null,
        driver.url || null,
        driver.notes || null,
        driver.installed_date || null
      );
    }
  }

  return NextResponse.json(equipment, { status: 201 });
}
