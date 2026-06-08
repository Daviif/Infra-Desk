import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

export const COOKIE_NAME = "infra-session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: "admin" | "tecnico";
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, secret());
  return {
    id: Number(payload.sub),
    username: payload["username"] as string,
    name: payload["name"] as string,
    role: payload["role"] as "admin" | "tecnico",
  };
}

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
