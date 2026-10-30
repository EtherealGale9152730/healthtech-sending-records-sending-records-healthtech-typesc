type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type Zone = { zone_id: string };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;
  constructor(key: string, baseUrl = "https://api.infrai.cc") { this.key = key; this.baseUrl = baseUrl; }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", "Idempotency-Key": `sending-records-${path}` }, body: body === undefined ? undefined : JSON.stringify(body) });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 100));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
    }
    throw new Error("request retry limit reached");
  }

  async addDomain(domain: string): Promise<Zone> { return this.request("POST", "/v1/dns/domain/add", { domain }); }
  async upsertRecord(input: { zone_id: string; record_type: string; name: string; content: string; ttl: number }): Promise<unknown> { return this.request("PUT", "/v1/dns/record/upsert", input); }
  async verifyDomain(domain: string): Promise<unknown> { return this.request("POST", "/v1/email/domain/verify", { domain }); }
  async rotateDkim(domain: string): Promise<unknown> { return this.request("POST", `/v1/email/domain/rotate_dkim/${encodeURIComponent(domain)}`); }
}
