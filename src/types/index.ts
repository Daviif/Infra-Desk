export interface Client {
  id: number;
  name: string;
  city: string | null;
  contact: string | null;
  notes: string | null;
  document_type: string | null;
  document: string | null;
  created_at: string;
}

export interface Equipment {
  id: number;
  client_id: number;
  type: string;
  brand: string | null;
  model: string | null;
  serial: string | null;
  ip_address: string | null;
  mac_address: string | null;
  user_account: string | null;
  responsible: string | null;
  status: "ativo" | "inativo" | "manutenção";
  location: string | null;
  remote_access: string | null;
  remote_access_password: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  monitoring_token?: string | null;
  maintenance_interval_days?: number | null;
  last_maintenance_date?: string | null;
}

export interface DiskInfo {
  drive: string;
  total_gb: number;
  free_gb: number;
  percent: number;
}

export interface MachineMetric {
  id: number;
  equipment_id: number;
  reported_at: string;
  is_online: boolean;
  disk_usage_json: string | null;
  ram_total_gb: number | null;
  ram_used_gb: number | null;
  cpu_percent: number | null;
  uptime_hours: number | null;
  os_version: string | null;
  hostname: string | null;
  ip_local: string | null;
  battery_percent: number | null;
  battery_plugged: boolean | null;
  pending_reboot: boolean | null;
  last_user: string | null;
  event_log_errors: number | null;
  antivirus_name: string | null;
  antivirus_enabled: boolean | null;
  smart_status: string | null;
}

export interface EquipmentConfig {
  id: number;
  equipment_id: number;
  config_type: string;
  config_key: string;
  config_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentDriver {
  id: number;
  equipment_id: number;
  driver_name: string;
  driver_version: string | null;
  driver_url: string | null;
  notes: string | null;
  installed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  client_id: number | null;
  equipment_id: number | null;
  date: string;
  problem: string;
  solution: string | null;
  status: "aberto" | "em_andamento" | "resolvido";
  time_spent: string | null;
  technician: string | null;
  tags: string | null;
  created_at: string;
  client_name?: string;
  equipment_label?: string;
}

export const EQUIPMENT_TYPES = [
  "MikroTik",
  "Switch",
  "Impressora",
  "Servidor",
  "Starlink",
  "Notebook",
  "Desktop",
  "Roteador",
  "NAS",
  "Câmera IP",
  "No-break",
  "Outro",
] as const;

export const EQUIPMENT_STATUS = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  inativo: { label: "Inativo", color: "bg-gray-100 text-gray-800" },
  manutenção: { label: "Manutenção", color: "bg-yellow-100 text-yellow-800" },
} as const;

export const EQUIPMENT_CONFIG_TYPES = {
  "Notebook": [
    { key: "cpu", label: "Processador" },
    { key: "gpu", label: "Placa de Vídeo" },
    { key: "ram", label: "Memória RAM" },
    { key: "storage", label: "Armazenamento" },
    { key: "os", label: "Sistema Operacional" },
  ],
  "Desktop": [
    { key: "cpu", label: "Processador" },
    { key: "gpu", label: "Placa de Vídeo" },
    { key: "ram", label: "Memória RAM" },
    { key: "storage", label: "Armazenamento" },
    { key: "os", label: "Sistema Operacional" },
  ],
  "Servidor": [
    { key: "cpu", label: "Processador" },
    { key: "gpu", label: "Placa de Vídeo" },
    { key: "ram", label: "Memória RAM" },
    { key: "storage", label: "Armazenamento" },
    { key: "os", label: "Sistema Operacional" },
    { key: "raid_config", label: "Configuração RAID" },
  ],
  "Roteador": [
    { key: "firmware", label: "Firmware" },
    { key: "admin_user", label: "Usuário Admin" },
    { key: "management_port", label: "Porta de Gerência" },
  ],
  "MikroTik": [
    { key: "firmware", label: "Firmware" },
    { key: "admin_user", label: "Usuário Admin" },
    { key: "management_port", label: "Porta de Gerência" },
    { key: "identity", label: "Identity" },
    { key: "board_name", label: "Board Name" },
  ],
  "Switch": [
    { key: "firmware", label: "Firmware" },
    { key: "vlan_config", label: "Configuração VLAN" },
    { key: "ports", label: "Portas" },
    { key: "admin_user", label: "Usuário Admin" },
  ],
  "Impressora": [
    { key: "toner_color", label: "Cor do Toner" },
    { key: "paper_size", label: "Tamanho de Papel" },
    { key: "page_count", label: "Contador de Páginas" },
  ],
  "NAS": [
    { key: "raid_config", label: "Configuração RAID" },
    { key: "backup_policy", label: "Política de Backup" },
    { key: "os", label: "Sistema Operacional" },
    { key: "storage", label: "Armazenamento Total" },
  ],
  "Starlink": [
    { key: "dish_id", label: "ID do Dish" },
    { key: "account", label: "Conta" },
    { key: "admin_url", label: "URL de Admin" },
  ],
  "Câmera IP": [
    { key: "rtsp_url", label: "URL RTSP" },
    { key: "resolution", label: "Resolução" },
    { key: "channel", label: "Canal" },
    { key: "firmware", label: "Firmware" },
  ],
  "No-break": [
    { key: "capacity", label: "Capacidade (VA)" },
    { key: "runtime", label: "Autonomia estimada" },
    { key: "battery_model", label: "Modelo da Bateria" },
  ],
  "Outro": [
    { key: "info", label: "Informação" },
  ],
} as const;

export const TICKET_STATUS = {
  aberto: { label: "Aberto", color: "bg-blue-100 text-blue-800" },
  em_andamento: { label: "Em andamento", color: "bg-yellow-100 text-yellow-800" },
  resolvido: { label: "Resolvido", color: "bg-green-100 text-green-800" },
} as const;
