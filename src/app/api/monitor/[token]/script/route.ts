import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { rows } = await pool.query(
    "SELECT id, type, brand, model FROM equipment WHERE monitoring_token = $1",
    [token]
  );
  if (!rows[0]) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const script = `# Infra-Desk — Agente de Monitoramento
# Equipamento: ${[rows[0].type, rows[0].brand, rows[0].model].filter(Boolean).join(" ")} (ID ${rows[0].id})
# Gerado em: ${new Date().toLocaleString("pt-BR")}

$Token   = "${token}"
$ApiUrl  = "${baseUrl}/api/monitor/$Token"

# ──────────────────────────────────────────
function Send-Metrics {
    # Discos locais
    $Disks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
        $pct = if ($_.Size -gt 0) { [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 1) } else { 0 }
        @{
            drive    = $_.DeviceID
            total_gb = [math]::Round($_.Size     / 1GB, 1)
            free_gb  = [math]::Round($_.FreeSpace / 1GB, 1)
            percent  = $pct
        }
    }

    # Memória RAM
    $OS        = Get-WmiObject Win32_OperatingSystem
    $RamTotal  = [math]::Round($OS.TotalVisibleMemorySize / 1MB, 1)
    $RamUsed   = [math]::Round(($OS.TotalVisibleMemorySize - $OS.FreePhysicalMemory) / 1MB, 1)

    # Uptime
    $Boot   = $OS.ConvertToDateTime($OS.LastBootUpTime)
    $Uptime = [math]::Round(((Get-Date) - $Boot).TotalHours, 1)

    # IP local (primeira interface ativa)
    $IpLocal = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.InterfaceAlias -notmatch "Loopback|Virtual" } |
        Select-Object -First 1).IPAddress

    $Body = @{
        hostname     = $env:COMPUTERNAME
        os_version   = $OS.Caption
        ip_local     = $IpLocal
        uptime_hours = $Uptime
        ram_total_gb = $RamTotal
        ram_used_gb  = $RamUsed
        disks        = $Disks
    } | ConvertTo-Json -Depth 3

    try {
        Invoke-RestMethod -Uri $ApiUrl -Method POST -Body $Body -ContentType "application/json" -UseBasicParsing | Out-Null
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Metricas enviadas com sucesso"
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Erro ao enviar: $_"
    }
}

Send-Metrics
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="infra-desk-agent-${rows[0].id}.ps1"`,
    },
  });
}
