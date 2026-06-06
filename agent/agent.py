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
import winreg

import psutil
import requests

import win32serviceutil
import win32service
import win32event
import servicemanager

# ── Configuração ─────────────────────────────────────────────────────────────

BASE_DIR   = os.path.dirname(sys.executable if getattr(sys, "frozen", False) else __file__)
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
LOG_PATH    = os.path.join(BASE_DIR, "agent.log")

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


def collect_metrics():
    mem             = psutil.virtual_memory()
    boot            = psutil.boot_time()
    battery_pct, battery_plug = get_battery()
    av_name, av_enabled = get_antivirus()

    return {
        "hostname":          socket.gethostname(),
        "os_version":        platform.version() and platform.win32_ver()[0] + " " + platform.win32_ver()[1] or platform.system(),
        "ip_local":          get_ip(),
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
        # Sem argumentos: tenta dispatcher do SCM; se falhar, mostra uso.
        try:
            servicemanager.Initialize()
            servicemanager.PrepareToHostSingle(InfraDeskAgent)
            servicemanager.StartServiceCtrlDispatcher()
        except win32service.error as exc:
            if exc.winerror == 1063:
                print(
                    "Este executável é um serviço Windows.\n"
                    "Use um dos comandos abaixo:\n"
                    "  agent.exe install   -> instala o serviço\n"
                    "  agent.exe start     -> inicia\n"
                    "  agent.exe stop      -> para\n"
                    "  agent.exe remove    -> desinstala\n"
                )
                sys.exit(1)
            raise
    else:
        win32serviceutil.HandleCommandLine(InfraDeskAgent)
