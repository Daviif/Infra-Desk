import { NextRequest, NextResponse } from "next/server";

interface CnpjResult {
  razao_social: string;
  municipio: string;
  uf: string;
  situacao_cadastral: string;
}

async function fromBrasilApi(digits: string): Promise<CnpjResult> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("brasilapi falhou");
  const d = await res.json();
  return {
    razao_social: d.razao_social ?? "",
    municipio: d.municipio ?? "",
    uf: d.uf ?? "",
    situacao_cadastral: d.descricao_situacao_cadastral ?? "",
  };
}

async function fromCnpjWs(digits: string): Promise<CnpjResult> {
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("cnpj.ws falhou");
  const d = await res.json();
  return {
    razao_social: d.razao_social ?? "",
    municipio: d.estabelecimento?.cidade?.nome ?? "",
    uf: d.estabelecimento?.estado?.sigla ?? "",
    situacao_cadastral: d.estabelecimento?.situacao_cadastral ?? "",
  };
}

async function fromReceitaWs(digits: string): Promise<CnpjResult> {
  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("receitaws falhou");
  const d = await res.json();
  if (d.status === "ERROR") throw new Error("receitaws: " + d.message);
  return {
    razao_social: d.nome ?? "",
    municipio: d.municipio ?? "",
    uf: d.uf ?? "",
    situacao_cadastral: d.situacao ?? "",
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const digits = number.replace(/\D/g, "");
  if (digits.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  const providers = [fromBrasilApi, fromCnpjWs, fromReceitaWs];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const data = await provider(digits);
      return NextResponse.json(data);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  console.error("Todos os provedores de CNPJ falharam:", errors);
  return NextResponse.json({ error: "CNPJ não encontrado na Receita Federal" }, { status: 404 });
}
