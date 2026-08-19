const API_BASE = import.meta.env.VITE_API_URL || '';

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn;
}

async function headers(init?: HeadersInit) {
  const h = new Headers(init);
  if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
  const token = tokenGetter ? await tokenGetter() : null;
  if (token) h.set('Authorization', `Bearer ${token}`);
  return h;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: await headers(init.headers),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; code?: string };
    throw new ApiError(body.error || response.statusText, response.status, body.code);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const h = new Headers();
  const token = tokenGetter ? await tokenGetter() : null;
  if (token) h.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: h,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; code?: string };
    throw new ApiError(body.error || response.statusText, response.status, body.code);
  }

  return response.json() as Promise<T>;
}

export async function apiStream(path: string, body: unknown): Promise<Response> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string; code?: string };
    throw new ApiError(payload.error || response.statusText, response.status, payload.code);
  }
  return response;
}
