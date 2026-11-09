const API = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('merchant_token');
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data ?? {};
}

export function clearSession() {
  localStorage.removeItem('merchant_token');
  localStorage.removeItem('merchant');
}

export function readMerchant() {
  try {
    return JSON.parse(localStorage.getItem('merchant') || '{}');
  } catch {
    return {};
  }
}
