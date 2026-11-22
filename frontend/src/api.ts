import type { ApiErrorBody, Meta } from "./types";

let csrfToken = "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? "GET").toUpperCase();
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers.set("X-DocuForge-CSRF", csrfToken);
  }
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Preserve the HTTP status when a proxy returns a non-JSON failure.
    }
    throw new ApiError(
      body.error?.message ?? `Request failed (${response.status})`,
      response.status,
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.details,
    );
  }
  return (await response.json()) as T;
}

export async function bootstrap(): Promise<Meta> {
  const meta = await api<Meta>("/api/v1/meta");
  setCsrfToken(meta.csrf_token);
  return meta;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export function formatBytes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let number = value;
  let index = 0;
  while (number >= 1024 && index < units.length - 1) {
    number /= 1024;
    index += 1;
  }
  return `${number.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}
