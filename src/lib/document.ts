export function stripDoc(v: string): string {
  return v.replace(/\D/g, "");
}

export function formatCPF(v: string): string {
  const d = stripDoc(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function formatCNPJ(v: string): string {
  const d = stripDoc(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

export function validateCPF(cpf: string): boolean {
  const d = stripDoc(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rem = sum % 11;
  if (parseInt(d[9]) !== (rem < 2 ? 0 : 11 - rem)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rem = sum % 11;
  return parseInt(d[10]) === (rem < 2 ? 0 : 11 - rem);
}

export function validateCNPJ(cnpj: string): boolean {
  const d = stripDoc(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (s: string, w: number[]) => {
    const rem = w.reduce((acc, wi, i) => acc + parseInt(s[i]) * wi, 0) % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return (
    parseInt(d[12]) === calc(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    parseInt(d[13]) === calc(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  );
}
