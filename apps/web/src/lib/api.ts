const envApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
export const apiBaseUrl = (envApiBaseUrl || "http://localhost:4000").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export type FetchOptions = RequestInit & {
  token?: string | null;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (token) {
    mergedHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: mergedHeaders,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as T | { error: string };
    if (!response.ok) {
      const err = json as { error?: string };
      throw new Error(err.error ?? `Request failed (${response.status})`);
    }
    return json as T;
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return null as T;
}
