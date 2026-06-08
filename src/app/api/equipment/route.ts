import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const client_id = searchParams.get("client_id");

  const { rows } = client_id
    ? await pool.query(
        `SELECT e.*, c.name as client_name FROM equipment e
         LEFT JOIN clients c ON e.client_id = c.id
         WHERE e.client_id = $1 ORDER BY e.type, e.brand`,
        [client_id]
      )
    : await pool.query(
        `SELECT e.*, c.name as client_name FROM equipment e
         LEFT JOIN clients c ON e.client_id = c.id
         ORDER BY e.created_at DESC`
      );

  const decrypted = rows.map((r) => ({
    ...r,
    remote_access_password:
      r.remote_access_password && isEncrypted(r.remote_access_password)
        ? decrypt(r.remote_access_password)
        : r.remote_access_password,
  }));

  return NextResponse.json(decrypted);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const body = await req.json();
  const {
    client_id, type, brand, model, serial, ip_address, mac_address,
    user_account, responsible, status, location, remote_access,
    remote_access_password, notes, configs, drivers,
  } = body;

  if (!client_id || !type) {
    return NextResponse.json({ error: "client_id e type são obrigatórios" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO equipment (
      client_id, type, brand, model, serial, ip_address, mac_address,
      user_account, responsible, status, location, remote_access, remote_access_password, notes, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
    RETURNING id`,
    [
      client_id, type, brand || null, model || null, serial || null,
      ip_address || null, mac_address || null, user_account || null,
      responsible || null, status || "ativo", location || null,
      remote_access || null,
      remote_access_password ? encrypt(remote_access_password) : null,
      notes || null,
    ]
  );

  const newId = rows[0].id;

  if (configs && Array.isArray(configs)) {
    for (const config of configs) {
      await pool.query(
        `INSERT INTO equipment_configs (equipment_id, config_type, config_key, config_value)
         VALUES ($1, $2, $3, $4)`,
        [newId, config.type, config.key, config.value]
      );
    }
  }

  if (drivers && Array.isArray(drivers)) {
    for (const driver of drivers) {
      await pool.query(
        `INSERT INTO equipment_drivers (equipment_id, driver_name, driver_version, driver_url, notes, installed_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newId, driver.name, driver.version || null, driver.url || null, driver.notes || null, driver.installed_date || null]
      );
    }
  }

  const { rows: equipment } = await pool.query(
    `SELECT e.*, c.name as client_name FROM equipment e
     LEFT JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1`,
    [newId]
  );

  const eq = equipment[0];
  if (eq?.remote_access_password && isEncrypted(eq.remote_access_password)) {
    eq.remote_access_password = decrypt(eq.remote_access_password);
  }

  logAudit("equipment", newId, "criado", session?.name ?? "Sistema");
  return NextResponse.json(eq, { status: 201 });
}
