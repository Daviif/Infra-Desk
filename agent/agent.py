"""
Infra-Desk Monitoring Agent
Windows Service — coleta métricas e envia ao sistema a cada N minutos.

Uso:
  agent.exe install    -> instala o serviço
  agent.exe start      -> inicia
  agent.exe stop       -> para
  agent.exe remove     -> desinstala
"""

import sys
import os
import json
import time
import socket
import platform
import logging
import subprocess
import winreg
import hashlib

import psutil
import requests

import win32serviceutil
import win32service
import win32event
import servicemanager

# ── Configuração ─────────────────────────────────────────────────────────────

BASE_DIR             = os.path.dirname(sys.executable if getattr(sys, "frozen", False) else __file__)
CONFIG_PATH          = os.path.join(BASE_DIR, "config.json")
LOG_PATH             = os.path.join(BASE_DIR, "agent.log")
HARDWARE_CACHE_PATH  = os.path.join(BASE_DIR, "hardware_cache.json")

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Coleta de métricas ────────────────────────────────────────────────────────

def get_disks():
    disks = []
    for part in psutil.disk_partitions():
        if "cdrom" in part.opts or not part.fstype:
            continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "drive":    part.device.replace("\\", "").rstrip(":") + ":",
                "total_gb": round(usage.total / 1024**3, 1),
                "free_gb":  round(usage.free  / 1024**3, 1),
                "percent":  round(usage.percent, 1),
            })
        except Exception:
            pass
    return disks


def get_battery():
    b = psutil.sensors_battery()
    if b is None:
        return None, None
    return round(b.percent, 1), b.power_plugged


def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def get_public_ip():
    for url in ("https://api.ipify.org", "https://checkip.amazonaws.com"):
        try:
            resp = requests.get(url, timeout=5)
            return resp.text.strip()
        except Exception:
            pass
    return None


def get_gateway():
    try:
        result = subprocess.check_output(
            ["route", "print", "0.0.0.0"],
            text=True,
            creationflags=0x08000000,  # CREATE_NO_WINDOW
        )
        for line in result.splitlines():
            parts = line.split()
            if len(parts) >= 3 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                return parts[2]
    except Exception:
        pass
    return None


def get_wifi_ssid():
    try:
        result = subprocess.check_output(
            ["netsh", "wlan", "show", "interfaces"],
            text=True,
            encoding="cp850",
            creationflags=0x08000000,
        )
        for line in result.splitlines():
            stripped = line.strip()
            if stripped.startswith("SSID") and "BSSID" not in stripped:
                parts = stripped.split(":", 1)
                if len(parts) == 2:
                    return parts[1].strip()
    except Exception:
        pass
    return None


def get_pending_reboot():
    keys = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired",
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending",
        r"SYSTEM\CurrentControlSet\Control\Session Manager",
    ]
    for path in keys[:2]:
        try:
            winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
            return True
        except OSError:
            pass
    # PendingFileRenameOperations
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, keys[2])
        val, _ = winreg.QueryValueEx(key, "PendingFileRenameOperations")
        if val:
            return True
    except OSError:
        pass
    return False


def get_last_user():
    try:
        import wmi
        c = wmi.WMI()
        for cs in c.Win32_ComputerSystem():
            return cs.UserName or None
    except Exception:
        pass
    return os.environ.get("USERNAME")


def get_event_log_errors():
    try:
        import wmi
        c = wmi.WMI()
        cutoff = time.strftime("%Y%m%d%H%M%S.000000-000",
                               time.gmtime(time.time() - 86400))
        events = c.Win32_NTLogEvent(
            EventType=1,  # 1 = Error
            LogFile="System",
        )
        count = sum(1 for e in events if e.TimeGenerated and e.TimeGenerated >= cutoff)
        return count
    except Exception:
        return None


def get_antivirus():
    try:
        import wmi
        c = wmi.WMI(namespace="root/SecurityCenter2")
        for av in c.AntiVirusProduct():
            name = av.displayName
            state = int(av.productState)
            enabled = ((state >> 12) & 0xF) == 1
            return name, enabled
    except Exception:
        pass
    return None, None


def get_smart_status():
    try:
        import wmi
        c = wmi.WMI()
        statuses = []
        for disk in c.Win32_DiskDrive():
            statuses.append(disk.Status or "Unknown")
        if statuses:
            return "OK" if all(s == "OK" for s in statuses) else ", ".join(set(statuses))
    except Exception:
        pass
    return None


# ── Inventário de hardware ────────────────────────────────────────────────────

_RAM_TYPE = {20: "DDR", 21: "DDR2", 24: "DDR3", 26: "DDR4", 34: "DDR5"}

# Classes de dispositivo ignoradas por serem irrelevantes para inventário de TI
_SKIP_DRIVER_CLASSES = {
    "System", "Processor", "Computer", "SoftwareComponent",
    "Unknown", "Firmware", "Volume", "ACPI", "HIDClass",
    "1394", "Infrastructure", "Enum",
}


def get_cpu_info():
    try:
        import wmi
        c = wmi.WMI()
        cpus = []
        for cpu in c.Win32_Processor():
            cpus.append({
                "name":     cpu.Name.strip() if cpu.Name else None,
                "cores":    cpu.NumberOfCores,
                "threads":  cpu.NumberOfLogicalProcessors,
                "max_mhz":  cpu.MaxClockSpeed,
            })
        return cpus
    except Exception:
        return []


def get_gpu_info():
    try:
        import wmi
        c = wmi.WMI()
        gpus = []
        for gpu in c.Win32_VideoController():
            if not gpu.Name:
                continue
            vram_mb = None
            try:
                vram_mb = int(gpu.AdapterRAM) // (1024 * 1024) if gpu.AdapterRAM else None
            except Exception:
                pass
            gpus.append({
                "name":    gpu.Name.strip(),
                "vram_mb": vram_mb,
            })
        return gpus
    except Exception:
        return []


def get_ram_info():
    try:
        import wmi
        c = wmi.WMI()
        slots = []
        for mem in c.Win32_PhysicalMemory():
            capacity_gb = None
            try:
                capacity_gb = int(mem.Capacity) // (1024 ** 3) if mem.Capacity else None
            except Exception:
                pass
            slots.append({
                "capacity_gb": capacity_gb,
                "speed_mhz":   mem.Speed,
                "type_code":   mem.MemoryType,
            })
        return slots
    except Exception:
        return []


def get_disk_models():
    try:
        import wmi
        c = wmi.WMI()
        disks = []
        for disk in c.Win32_DiskDrive():
            size_gb = None
            try:
                size_gb = round(int(disk.Size) / 1024 ** 3, 1) if disk.Size else None
            except Exception:
                pass
            disks.append({
                "model":     disk.Model.strip() if disk.Model else None,
                "size_gb":   size_gb,
                "interface": disk.InterfaceType,
            })
        return disks
    except Exception:
        return []


def get_installed_drivers():
    try:
        import wmi
        c = wmi.WMI()
        drivers = []
        for drv in c.Win32_PnPSignedDriver():
            if not drv.DeviceName or not drv.DriverVersion:
                continue
            if (drv.DeviceClass or "Unknown") in _SKIP_DRIVER_CLASSES:
                continue
            drivers.append({
                "name":     drv.DeviceName.strip(),
                "version":  drv.DriverVersion,
                "date":     drv.DriverDate,
                "provider": drv.DriverProviderName,
            })
        return drivers
    except Exception:
        return []


def collect_hardware():
    return {
        "cpu":         get_cpu_info(),
        "gpu":         get_gpu_info(),
        "ram":         get_ram_info(),
        "disk_models": get_disk_models(),
        "drivers":     get_installed_drivers(),
    }


def send_hardware_if_changed(api_url: str):
    try:
        hardware      = collect_hardware()
        hardware_json = json.dumps(hardware, sort_keys=True)
        current_hash  = hashlib.sha256(hardware_json.encode()).hexdigest()

        cached_hash = None
        if os.path.exists(HARDWARE_CACHE_PATH):
            try:
                with open(HARDWARE_CACHE_PATH, "r", encoding="utf-8") as f:
                    cached_hash = json.load(f).get("hash")
            except Exception:
                pass

        if current_hash == cached_hash:
            logging.info("Hardware sem mudanças, envio ignorado.")
            return

        hw_url = api_url.replace("/api/monitor/", "/api/hardware/")
        resp   = requests.post(hw_url, json=hardware, timeout=60)
        resp.raise_for_status()

        with open(HARDWARE_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump({"hash": current_hash, "sent_at": time.strftime("%Y-%m-%dT%H:%M:%S")}, f)

        logging.info("Inventário de hardware enviado (mudança detectada).")
    except Exception as exc:
        logging.error("Erro ao enviar hardware: %s", exc)


def collect_metrics():
    mem             = psutil.virtual_memory()
    boot            = psutil.boot_time()
    battery_pct, battery_plug = get_battery()
    av_name, av_enabled = get_antivirus()

    return {
        "hostname":          socket.gethostname(),
        "os_version":        platform.version() and platform.win32_ver()[0] + " " + platform.win32_ver()[1] or platform.system(),
        "ip_local":          get_ip(),
        "ip_public":         get_public_ip(),
        "gateway":           get_gateway(),
        "wifi_ssid":         get_wifi_ssid(),
        "uptime_hours":      round((time.time() - boot) / 3600, 1),
        "ram_total_gb":      round(mem.total / 1024**3, 1),
        "ram_used_gb":       round(mem.used  / 1024**3, 1),
        "cpu_percent":       psutil.cpu_percent(interval=2),
        "disks":             get_disks(),
        "battery_percent":   battery_pct,
        "battery_plugged":   battery_plug,
        "pending_reboot":    get_pending_reboot(),
        "last_user":         get_last_user(),
        "event_log_errors":  get_event_log_errors(),
        "antivirus_name":    av_name,
        "antivirus_enabled": av_enabled,
        "smart_status":      get_smart_status(),
    }


def send_metrics(api_url: str):
    try:
        metrics = collect_metrics()
        resp = requests.post(api_url, json=metrics, timeout=30)
        resp.raise_for_status()
        logging.info("Métricas enviadas. Status: %s", resp.status_code)
    except Exception as exc:
        logging.error("Erro ao enviar métricas: %s", exc)

    send_hardware_if_changed(api_url)


# ── Windows Service ───────────────────────────────────────────────────────────

class InfraDeskAgent(win32serviceutil.ServiceFramework):
    _svc_name_         = "InfraDeskAgent"
    _svc_display_name_ = "Infra-Desk Monitoring Agent"
    _svc_description_  = "Monitora o sistema e envia métricas para o Infra-Desk."

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running    = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        self.running = False

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, ""),
        )
        self.run()

    def run(self):
        try:
            cfg = load_config()
        except Exception as exc:
            logging.critical("Falha ao ler config.json: %s", exc)
            return

        api_url  = cfg.get("api_url", "")
        interval = int(cfg.get("interval_minutes", 30)) * 60 * 1000  # ms

        while self.running:
            send_metrics(api_url)
            result = win32event.WaitForSingleObject(self.stop_event, interval)
            if result == win32event.WAIT_OBJECT_0:
                break


# ── Ponto de entrada ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # Modo direto: roda o loop sem precisar instalar como serviço Windows.
        try:
            cfg = load_config()
        except Exception as exc:
            logging.critical("Falha ao ler config.json: %s", exc)
            sys.exit(1)

        api_url  = cfg.get("api_url", "")
        interval = int(cfg.get("interval_minutes", 30)) * 60

        logging.info("Agente iniciado (modo direto).")
        while True:
            send_metrics(api_url)
            time.sleep(interval)
    else:
        # Modo serviço Windows (opcional): install / start / stop / remove
        win32serviceutil.HandleCommandLine(InfraDeskAgent)
