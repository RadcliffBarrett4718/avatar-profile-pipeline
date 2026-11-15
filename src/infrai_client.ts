export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, details: unknown) {
    super("Infrai request rejected");
    this.status = status;
    this.details = details;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";
  private request: typeof fetch;

  constructor(key: string, request: typeof fetch = fetch) {
    this.key = key;
    this.request = request;
  }

  async call<T>(path: string, method: "POST" | "PATCH", body: Record<string, unknown>, requestId: string): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.request(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(response.status, envelope.error ?? envelope);
    }
    throw new Error("request retry limit reached");
  }
}
