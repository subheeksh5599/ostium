const BASE = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || "")
  : "";

export async function api(path: string, options?: RequestInit) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res.json();
}
