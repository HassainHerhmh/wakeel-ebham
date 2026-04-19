const BACKEND_BASE_URL = 'https://ebham-backend-production.up.railway.app/api';

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function buildForwardHeaders(request) {
  const headers = { ...request.headers };

  delete headers.host;
  delete headers.connection;
  delete headers.origin;
  delete headers.referer;
  delete headers['content-length'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];
  delete headers['x-vercel-id'];

  return headers;
}

function getPathFromQuery(query) {
  const raw = query?.path;

  if (Array.isArray(raw)) {
    return raw.join('/');
  }

  if (typeof raw === 'string') {
    return raw;
  }

  return '';
}

function buildSearchFromQuery(query) {
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (key === 'path' || value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }

    params.append(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export default async function handler(request, response) {
  const path = getPathFromQuery(request.query);
  const search = buildSearchFromQuery(request.query);
  const method = request.method || 'GET';
  const targetUrl = `${BACKEND_BASE_URL}/${path}${search}`;

  try {
    const body = method === 'GET' || method === 'HEAD' ? undefined : await readRequestBody(request);

    const backendResponse = await fetch(targetUrl, {
      method,
      headers: buildForwardHeaders(request),
      body,
    });

    response.status(backendResponse.status);
    backendResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(lower)) {
        response.setHeader(key, value);
      }
    });

    const payload = Buffer.from(await backendResponse.arrayBuffer());
    response.send(payload);
  } catch (error) {
    response.status(502).json({
      success: false,
      message: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
}
