const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

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

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...restOptions,
    headers,
    body: body && !isFormData && typeof body === "object" ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
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
