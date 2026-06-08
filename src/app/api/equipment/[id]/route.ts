import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { randomUUID } from "crypto";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import { getSession } from "@/lib/auth";
import { logAudit, diffEquipment } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows: equipRows } = await pool.query(
    `SELECT e.*, c.name as client_name FROM equipment e
     LEFT JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1`,
    [id]
  );

  if (!equipRows[0]) {
    return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
  }

  const [{ rows: configs }, { rows: drivers }, { rows: metrics }] = await Promise.all([
    pool.query("SELECT * FROM equipment_configs WHERE equipment_id = $1", [id]),
    pool.query("SELECT * FROM equipment_drivers WHERE equipment_id = $1 ORDER BY installed_date DESC", [id]),
    pool.query("SELECT * FROM machine_metrics WHERE equipment_id = $1 ORDER BY reported_at DESC LIMIT 1", [id]),
  ]);

  const eq = equipRows[0];
  if (eq?.remote_access_password && isEncrypted(eq.remote_access_password)) {
    eq.remote_access_password = decrypt(eq.remote_access_password);
  }

  return NextResponse.json({ ...eq, configs, drivers, latest_metric: metrics[0] ?? null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  const { id } = await params;
  const body = await req.json();
  const {
    type, brand, model, serial, ip_address, mac_address,
    user_account, responsible, status, location, remote_access,
    remote_access_password, notes, configs, drivers,
    maintenance_interval_days, last_maintenance_date, generate_token,
  } = body;

  if (!type) {
    return NextResponse.json({ error: "type é obrigatório" }, { status: 400 });
  }

  const { rows: beforeRows } = await pool.query(
    "SELECT type,brand,model,serial,ip_address,mac_address,user_account,responsible,status,location,remote_access,notes,maintenance_interval_days,last_maintenance_date FROM equipment WHERE id=$1",
    [id]
  );
  const before = beforeRows[0] ?? {};

  // Gera novo token se solicitado ou se ainda não tem
  if (generate_token) {
    await pool.query("UPDATE equipment SET monitoring_token = $1 WHERE id = $2", [randomUUID(), id]);
  }

  await pool.query(
    `UPDATE equipment SET
      type=$1, brand=$2, model=$3, serial=$4, ip_address=$5, mac_address=$6,
      user_account=$7, responsible=$8, status=$9, location=$10,
      remote_access=$11, remote_access_password=$12, notes=$13,
      maintenance_interval_days=$14, last_maintenance_date=$15, updated_at=NOW()
     WHERE id=$16`,
    [
      type, brand || null, model || null, serial || null,
      ip_address || null, mac_address || null, user_account || null,
      responsible || null, status || "ativo", location || null,
      remote_access || null,
      remote_access_password ? encrypt(remote_access_password) : null,
      notes || null,
      maintenance_interval_days || null,
      last_maintenance_date || null,
      id,
    ]
  );

  if (configs && Array.isArray(configs)) {
    // Preserva hardware_inventory — gerenciado exclusivamente pelo agente
    await pool.query(
      "DELETE FROM equipment_configs WHERE equipment_id = $1 AND config_type != 'hardware_inventory'",
      [id],
    );
    for (const config of configs) {
      await pool.query(
        `INSERT INTO equipment_configs (equipment_id, config_type, config_key, config_value)
         VALUES ($1, $2, $3, $4)`,
        [id, config.type, config.key, config.value]
      );
    }
  }

  if (drivers && Array.isArray(drivers)) {
    for (const driver of drivers) {
      if (driver.id) {
        await pool.query(
          `UPDATE equipment_drivers SET
            driver_name=$1, driver_version=$2, driver_url=$3, notes=$4, installed_date=$5, updated_at=NOW()
           WHERE id=$6 AND equipment_id=$7`,
          [driver.name, driver.version || null, driver.url || null, driver.notes || null, driver.installed_date || null, driver.id, id]
        );
      } else {
        await pool.query(
          `INSERT INTO equipment_drivers (equipment_id, driver_name, driver_version, driver_url, notes, installed_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, driver.name, driver.version || null, driver.url || null, driver.notes || null, driver.installed_date || null]
        );
      }
    }
  }

  const [{ rows: equipRows }, { rows: updatedConfigs }, { rows: updatedDrivers }] = await Promise.all([
    pool.query(
      `SELECT e.*, c.name as client_name FROM equipment e
       LEFT JOIN clients c ON e.client_id = c.id WHERE e.id = $1`,
      [id]
    ),
    pool.query("SELECT * FROM equipment_configs WHERE equipment_id = $1", [id]),
    pool.query("SELECT * FROM equipment_drivers WHERE equipment_id = $1 ORDER BY installed_date DESC", [id]),
  ]);

  const updated = equipRows[0];
  if (updated?.remote_access_password && isEncrypted(updated.remote_access_password)) {
    updated.remote_access_password = decrypt(updated.remote_access_password);
  }

  const after = { type, brand: brand||null, model: model||null, serial: serial||null, ip_address: ip_address||null, mac_address: mac_address||null, user_account: user_account||null, responsible: responsible||null, status: status||"ativo", location: location||null, remote_access: remote_access||null, notes: notes||null, maintenance_interval_days: maintenance_interval_days||null, last_maintenance_date: last_maintenance_date||null };
  const changes = diffEquipment(before, after);
  if (changes.length > 0) logAudit("equipment", Number(id), "atualizado", session?.name ?? "Sistema", changes);

  return NextResponse.json(updated ? { ...updated, configs: updatedConfigs, drivers: updatedDrivers } : null);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  const { id } = await params;
  logAudit("equipment", Number(id), "excluído", session?.name ?? "Sistema");
  await pool.query("DELETE FROM equipment_drivers WHERE equipment_id = $1", [id]);
  await pool.query("DELETE FROM equipment_configs WHERE equipment_id = $1", [id]);
  await pool.query("DELETE FROM equipment WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
