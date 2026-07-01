/**
 * Leichtes In-Memory-Rate-Limit (Sliding Window) für die öffentlichen
 * API-Routen. Gilt pro Serverless-Instanz — bremst naive Bots und
 * Brute-Force, ersetzt aber keinen verteilten Store (z. B. Upstash),
 * falls später echter Angriffsschutz nötig wird.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

/** Erste Adresse aus x-forwarded-for (Vercel setzt den Header zuverlässig). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
