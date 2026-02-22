export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "/api"; // на сервере nginx проксирует /api

export async function getJSON<TResponse>(path: string, token?: string): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<TResponse>;
}

export async function postJSON<TResponse>(
  path: string,
  body: unknown,
  token?: string,
): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<TResponse>;
}

export async function patchJSON<TResponse>(
  path: string,
  body: unknown,
  token?: string,
): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<TResponse>;
}

export async function deleteJSON<TResponse = unknown>(path: string, token?: string): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as TResponse;
}

/** Загрузка файла (фото). Возвращает URL для подстановки в imageUrl. */
export async function uploadFile(path: string, file: File, token: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const data = (await res.json()) as { url: string };
  return { url: `${API_BASE}${data.url}` };
}
