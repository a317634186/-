const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '0.0.0.0';
const cacheMaxAge = process.env.NODE_ENV === 'production' ? 86400 : 0;

const compressible = new Set(['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'image/svg+xml']);

function safePath(url) {
  let decoded;
  try {
    decoded = decodeURIComponent(url.split('?')[0]);
  } catch {
    return null;
  }
  const resolved = path.join(root, decoded === '/' ? 'index.html' : decoded);
  return resolved === root || resolved.startsWith(root + path.sep) ? resolved : null;
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method Not Allowed');
    return;
  }

  const filePath = safePath(request.url);
  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mime[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    if (cacheMaxAge > 0 && ext !== '.html') {
      headers['Cache-Control'] = `public, max-age=${cacheMaxAge}`;
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
    }

    const acceptEncoding = request.headers['accept-encoding'] || '';
    const shouldCompress = compressible.has(contentType.split(';')[0]) && data.length > 1024;

    if (shouldCompress && acceptEncoding.includes('br')) {
      zlib.brotliCompress(data, (err, compressed) => {
        if (err || !compressed || compressed.length >= data.length) {
          sendRaw(response, headers, data);
        } else {
          headers['Content-Encoding'] = 'br';
          headers['Content-Length'] = compressed.length;
          response.writeHead(200, headers);
          response.end(compressed);
        }
      });
    } else if (shouldCompress && acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (err, compressed) => {
        if (err || !compressed || compressed.length >= data.length) {
          sendRaw(response, headers, data);
        } else {
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = compressed.length;
          response.writeHead(200, headers);
          response.end(compressed);
        }
      });
    } else {
      sendRaw(response, headers, data);
    }
  });
});

function sendRaw(response, headers, data) {
  headers['Content-Length'] = data.length;
  response.writeHead(200, headers);
  response.end(data);
}

server.listen(port, host, () => {
  console.log(`PrimeOps: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
});
