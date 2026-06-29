// Small fetch wrapper used by all real provider/adapter integrations.
// Adds timeouts, consistent error messages, and convenience parsers.

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function parse(res) {
  const text = await res.text();
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }
  return text;
}

/**
 * fetch with a timeout (AbortController) and structured error on non-2xx.
 * @returns {Promise<any>} parsed body (JSON object or text)
 */
export async function request(url, { timeoutMs = 30_000, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new ApiError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new ApiError(`Network error calling ${url}: ${e.message}`);
  }
  clearTimeout(timer);

  const body = await parse(res);
  if (!res.ok) {
    const detail =
      typeof body === 'string' ? body : JSON.stringify(body).slice(0, 500);
    throw new ApiError(`${res.status} from ${url}: ${detail}`, {
      status: res.status,
      body,
    });
  }
  return body;
}

export function getJson(url, { headers = {}, ...rest } = {}) {
  return request(url, { method: 'GET', headers, ...rest });
}

export function postJson(url, data, { headers = {}, ...rest } = {}) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
    ...rest,
  });
}

export function postForm(url, params, { headers = {}, ...rest } = {}) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(params).toString(),
    ...rest,
  });
}
