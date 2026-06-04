const TAG_KEYWORDS: [string, string[]][] = [
  ["VPN",          ["vpn", "wireguard", "openvpn", "túnel", "tunnel"]],
  ["MikroTik",     ["mikrotik", "winbox", "routerboard", "chr"]],
  ["Impressora",   ["impressora", "printer", "toner", "cartucho", "papel", "impressão", "scanner", "digitalizar"]],
  ["Rede",         ["sem internet", "sem acesso", "rede caiu", "cabo", "switch", "ping", "sem conexão", "queda de rede", "conectividade"]],
  ["Wi-Fi",        ["wifi", "wi-fi", "wireless", "sem sinal", "sinal fraco", "ssid"]],
  ["Servidor",     ["servidor", "server", "windows server", "active directory", "domínio", "domain controller"]],
  ["E-mail",       ["email", "e-mail", "outlook", "smtp", "pop3", "imap", "caixa de entrada"]],
  ["Backup",       ["backup", "restaurar", "restore", "recuperar", "arquivo perdido"]],
  ["Firewall",     ["firewall", "bloqueio", "acesso bloqueado", "regra de firewall"]],
  ["DNS",          ["dns", "não resolve", "nome não encontrado"]],
  ["DHCP",         ["dhcp", "sem ip", "não obteve ip", "endereço ip"]],
  ["Hardware",     ["memória", "ram", "hd", "ssd", "disco", "fonte", "tela", "monitor", "superaquecendo", "não liga", "travando", "lento"]],
  ["Software",     ["instalação", "instalar", "atualizar", "atualização", "driver", "licença", "programa", "windows", "erro ao abrir"]],
  ["RIS/PACS",     ["ris", "pacs", "dicom", "orthanc", "worklist", "radiologia", "tomografia", "raio-x"]],
  ["Câmera",       ["câmera", "camera", "nvr", "dvr", "cftv", "gravação de vídeo"]],
  ["No-break",     ["no-break", "nobreak", "ups", "bateria", "energia elétrica"]],
  ["Starlink",     ["starlink", "satélite"]],
  ["NAS",          ["nas", "synology", "qnap", "armazenamento de rede"]],
  ["Acesso Remoto",["acesso remoto", "teamviewer", "anydesk", "rdp", "vnc", "área de trabalho remota"]],
];

export function generateTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const [tag, keywords] of TAG_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags;
}
