const BACKEND_BASE_URL = 'https://ebham-backend-production.up.railway.app/api';

function getTargetPath(path) {
  if (Array.isArray(path)) {
    return path.join('/');
  }

  return path || '';
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function buildHeaders(request) {
  const headers = { ...request.headers };

  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  delete headers.origin;
  delete headers.referer;
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];
  delete headers['x-vercel-id'];

  return headers;
}

export default async function handler(request, response) {
  const targetPath = getTargetPath(request.query.path);
  const search = request.url.includes('?') ? `?${request.url.split('?').slice(1).join('?')}` : '';
  const targetUrl = `${BACKEND_BASE_URL}/${targetPath}${search}`;
  const method = request.method || 'GET';

  try {
    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : await readRequestBody(request);

    const backendResponse = await fetch(targetUrl, {
      method,
      headers: buildHeaders(request),
      body,
    });

    response.status(backendResponse.status);
    backendResponse.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        response.setHeader(key, value);
      }
    });

    const responseBody = Buffer.from(await backendResponse.arrayBuffer());
    response.send(responseBody);
  } catch (error) {
    response.status(502).json({
      success: false,
      message: 'تعذر الوصول إلى السيرفر الخلفي',
      details: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
}
