const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

type FetchOptions = RequestInit & { token?: string };

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...init, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Auth ───
export const auth = {
  register: (data: any) =>
    fetchApi<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    fetchApi<any>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};

// ─── Catalog ───
export const catalog = {
  listProducts: (token: string, page = 1) =>
    fetchApi<any>(`/catalog/products?page=${page}`, { token }),
  getProduct: (token: string, id: string) =>
    fetchApi<any>(`/catalog/products/${id}`, { token }),
  createProduct: (token: string, data: any) =>
    fetchApi<any>("/catalog/products", { method: "POST", body: JSON.stringify(data), token }),
  listCategories: (token: string) =>
    fetchApi<any>("/catalog/categories", { token }),
  createCategory: (token: string, data: any) =>
    fetchApi<any>("/catalog/categories", { method: "POST", body: JSON.stringify(data), token }),
};

// ─── Stock ───
export const stock = {
  listLocations: (token: string) =>
    fetchApi<any>("/stock/locations", { token }),
  createLocation: (token: string, data: any) =>
    fetchApi<any>("/stock/locations", { method: "POST", body: JSON.stringify(data), token }),
  stockIn: (token: string, data: any) =>
    fetchApi<any>("/stock/in", { method: "POST", body: JSON.stringify(data), token }),
  getCurrentStock: (token: string, variantId: string, locationId: string) =>
    fetchApi<any>(`/stock/current/${variantId}/${locationId}`, { token }),
  getStockByLocation: (token: string, locationId: string) =>
    fetchApi<any>(`/stock/location/${locationId}`, { token }),
};

// ─── POS ───
export const pos = {
  createTicket: (token: string, data: any) =>
    fetchApi<any>("/pos/tickets", { method: "POST", body: JSON.stringify(data), token }),
  completeTicket: (token: string, ticketId: string, data: any) =>
    fetchApi<any>(`/pos/tickets/${ticketId}/complete`, { method: "POST", body: JSON.stringify(data), token }),
  parkTicket: (token: string, ticketId: string) =>
    fetchApi<any>(`/pos/tickets/${ticketId}/park`, { method: "PATCH", token }),
  voidTicket: (token: string, ticketId: string) =>
    fetchApi<any>(`/pos/tickets/${ticketId}/void`, { method: "PATCH", token }),
  getTicket: (token: string, ticketId: string) =>
    fetchApi<any>(`/pos/tickets/${ticketId}`, { token }),
  listTickets: (token: string, params?: string) =>
    fetchApi<any>(`/pos/tickets${params ? `?${params}` : ""}`, { token }),
  zReport: (token: string, locationId: string, date?: string) =>
    fetchApi<any>(`/pos/z-report/${locationId}${date ? `?date=${date}` : ""}`, { token }),
};
