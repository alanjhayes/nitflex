import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "nitflex-secret";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function signStreamToken(url: string, referer: string): string {
  const payload = JSON.stringify({ url, referer, exp: Date.now() + TTL_MS });
  const data = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyStreamToken(token: string): { url: string; referer: string } {
  const dot = token.lastIndexOf(".");
  if (dot === -1) throw new Error("Malformed token");

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedBuf = createHmac("sha256", SECRET).update(data).digest();
  const sigBuf = Buffer.from(sig, "base64url");

  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(Buffer.from(data, "base64url").toString());
  if (Date.now() > payload.exp) throw new Error("Token expired");

  return { url: payload.url, referer: payload.referer };
}
