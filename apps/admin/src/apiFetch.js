const STORAGE_KEY = 'skarpay_admin_key';

export function getAdminKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearAdminKey() {
  localStorage.removeItem(STORAGE_KEY);
}

// Attach the console admin key to every same-origin API call. This keeps the
// existing components unchanged while protecting merchant/admin endpoints.
const nativeFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const rawUrl = typeof input === 'string' ? input : input?.url || '';
  let path = rawUrl;
  try {
    path = new URL(rawUrl, window.location.origin).pathname;
  } catch {
    // keep rawUrl
  }

  if (path.startsWith('/api/')) {
    const key = getAdminKey();
    if (key) {
      const headers = new Headers(
        init.headers || (typeof input === 'object' && input?.headers) || undefined,
      );
      headers.set('X-Admin-Key', key);
      init = { ...init, headers };
    }
  }

  return nativeFetch(input, init);
};
