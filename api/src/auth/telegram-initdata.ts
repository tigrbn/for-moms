import crypto from "crypto";

export function verifyTelegramInitData(initData: string, botToken: string): { ok: true; user: any } | { ok: false } {
  if (!initData || !botToken) return { ok: false };

  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};
  params.forEach((v, k) => (data[k] = v));

  const hash = data["hash"];
  if (!hash) return { ok: false };
  delete data["hash"];

  const checkString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return { ok: false };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false };

  const userRaw = data["user"];
  const user = userRaw ? JSON.parse(userRaw) : null;
  if (!user?.id) return { ok: false };

  return { ok: true, user };
}
