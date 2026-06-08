import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const RAM_TYPE: Record<number, string> = {
  20: "DDR", 21: "DDR2", 24: "DDR3", 26: "DDR4", 34: "DDR5",
};

interface CpuInfo    { name: string; cores: number; threads: number; max_mhz: number }
interface GpuInfo    { name: string; vram_mb: number | null }
interface RamSlot    { capacity_gb: number | null; speed_mhz: number | null; type_code: number | null }
interface DiskModel  { model: string | null; size_gb: number | null; interface: string | null }
interface DriverInfo { name: string; version: string | null; date: string | null; provider: string | null }

function formatCpu(cpus: CpuInfo[]): string | null {
  if (!cpus.length) return null;
  const cpu = cpus[0];
  const suffix = cpu.cores ? ` (${cpu.cores}c/${cpu.threads}t)` : "";
  return (cpu.name ?? "CPU desconhecida") + suffix;
}

function formatGpu(gpus: GpuInfo[]): string | null {
  if (!gpus.length) return null;
  return gpus
    .map((g) => {
      const vram = g.vram_mb != null ? ` (${Math.round(g.vram_mb / 1024)} GB)` : "";
      return g.name + vram;
    })
    .join(" | ");
}

function formatRam(slots: RamSlot[]): string | null {
  if (!slots.length) return null;
  const total   = slots.reduce((s, m) => s + (m.capacity_gb ?? 0), 0);
  const type    = RAM_TYPE[slots[0]?.type_code ?? 0] ?? "RAM";
  const speed   = slots[0]?.speed_mhz ? ` ${slots[0].speed_mhz} MHz` : "";
  const detail  = slots.length > 1 ? ` (${slots.length}× ${slots[0]?.capacity_gb ?? "?"}GB)` : "";
  return `${total} GB ${type}${speed}${detail}`;
}

function formatDisks(disks: DiskModel[]): string | null {
  if (!disks.length) return null;
  return disks
    .map((d) => `${d.model ?? "Disco"} ${d.size_gb != null ? d.size_gb + " GB" : ""}`.trim())
    .join(" | ");
}

function parseDriverDate(wmiDate: string | null): string | null {
  if (!wmiDate) return null;
  const m = wmiDate.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const { rows: equip } = await pool.query(
    "SELECT id FROM equipment WHERE monitoring_token = $1",
    [token],
  );
  if (!equip[0]) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const equipmentId: number = equip[0].id;
  const body = await req.json();

  const { cpu = [], gpu = [], ram = [], disk_models = [], drivers = [] } = body as {
    cpu: CpuInfo[];
    gpu: GpuInfo[];
    ram: RamSlot[];
    disk_models: DiskModel[];
    drivers: DriverInfo[];
  };

  // ── Upsert hardware configs ────────────────────────────────────────────────
  const specs: Array<[string, string | null]> = [
    ["cpu",     formatCpu(cpu)],
    ["gpu",     formatGpu(gpu)],
    ["ram",     formatRam(ram)],
    ["storage", formatDisks(disk_models)],
  ];

  for (const [key, value] of specs) {
    if (!value) continue;
    await pool.query(
      `INSERT INTO equipment_configs (equipment_id, config_type, config_key, config_value, updated_at)
       VALUES ($1, 'hardware_inventory', $2, $3, NOW())
       ON CONFLICT (equipment_id, config_type, config_key)
       DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()`,
      [equipmentId, key, value],
    );
  }

  // ── Sync auto-detected drivers ────────────────────────────────────────────
  // Deletes previous auto entries and reinserts current snapshot
  await pool.query(
    "DELETE FROM equipment_drivers WHERE equipment_id = $1 AND notes LIKE '[auto]%'",
    [equipmentId],
  );

  if (Array.isArray(drivers) && drivers.length > 0) {
    for (const drv of drivers as DriverInfo[]) {
      await pool.query(
        `INSERT INTO equipment_drivers
           (equipment_id, driver_name, driver_version, notes, installed_date, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          equipmentId,
          drv.name ?? "Driver",
          drv.version ?? null,
          drv.provider ? `[auto] ${drv.provider}` : "[auto]",
          parseDriverDate(drv.date),
        ],
      );
    }
  }

  return NextResponse.json({ ok: true });
}
