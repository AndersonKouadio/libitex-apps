const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const { token, body, ...rest } = opts;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || errorBody?.message || `Erreur ${response.status}`);
    }

    if (response.status === 204) return undefined as T;

    const json = await response.json();
    // Le backend enveloppe dans { success, data } — on extrait data
    return json.data !== undefined ? json.data : json;
  }

  get<T>(path: string, opts?: RequestOptions) {
    return this.request<T>("GET", path, opts);
  }

  post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("POST", path, { ...opts, body });
  }

  patch<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("PATCH", path, { ...opts, body });
  }

  delete<T>(path: string, opts?: RequestOptions) {
    return this.request<T>("DELETE", path, opts);
  }
}

export const httpClient = new HttpClient(BASE_URL);
