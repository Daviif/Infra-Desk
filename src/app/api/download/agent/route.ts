import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CANDIDATE_PATHS = [
  path.join(process.cwd(), "public", "downloads", "infra-desk-agent.exe"),
  path.join(process.cwd(), "agent", "dist", "infra-desk-agent.exe"),
];

export async function GET() {
  const exePath = CANDIDATE_PATHS.find((p) => existsSync(p));

  if (!exePath) {
    return NextResponse.json(
      { error: "Arquivo infra-desk-agent.exe não encontrado. Compile o agente com agent/build.bat primeiro." },
      { status: 404 }
    );
  }

  const buffer = await readFile(exePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="infra-desk-agent.exe"',
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
