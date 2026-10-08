const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
export const AUTH_TOKEN_KEY = "sari_admin_token";
export const AUTH_EXPIRED_EVENT = "sari-auth-expired";

export function getBaseApiUrl(): string {
  return API_URL;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: BodyInit | Record<string, unknown> | Array<unknown> | null | unknown;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, body, ...restOptions } = options;

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(customHeaders || {});
  headers.set("Accept", "application/json");
  const isApiOrigin = typeof window !== "undefined" &&
    new URL(url, window.location.origin).origin === new URL(API_URL, window.location.origin).origin;
  const token = isApiOrigin ? sessionStorage.getItem(AUTH_TOKEN_KEY) : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...restOptions,
    cache: "no-store",
    headers,
    body: body && !isFormData && typeof body === "object" ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token && sessionStorage.getItem(AUTH_TOKEN_KEY) === token) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    let errorMsg = json.message || `Request failed with status ${res.status}`;
    if (json.errors && typeof json.errors === "object") {
      const details = Object.values(json.errors).flat().join(". ");
      if (details) errorMsg = details;
    }
    throw new Error(errorMsg);
  }

  // If payload contains 'data' envelope, unwrap it; otherwise return raw json
  return (json.data !== undefined ? json.data : json) as T;
}

// Backward compatibility alias
export const fetchApi = apiClient;
